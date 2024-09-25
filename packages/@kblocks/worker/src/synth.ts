import fs from "fs/promises";
import path from "path";
import { applyHelm } from "./helm";
import { tempdir } from "./util";
import { applyWing } from "./wing";
import { resolveReferences } from "./refs";
import { explainError } from "./ai";
import { applyTofu } from "./tofu";
import { patchObjectState, publishEvent, RuntimeHost } from "./host";
import { BindingContext, ObjectRef } from "./types";
import { ObjectEvent, WorkerEvent } from "./events";

export async function synth(sourcedir: string, host: RuntimeHost, engine: string, ctx: BindingContext) {
  // skip updates to the "status" subresource
  if (ctx.watchEvent === "Modified") {
    const managedFields = ctx.object.metadata?.managedFields ?? [];
    const last = managedFields.length > 0 ? managedFields[managedFields.length - 1] : undefined;
    if (last?.subresource === "status") {
      return;
    }
  }

  const objRef: ObjectRef = {
    kind: ctx.object.kind,
    namespace: ctx.object.metadata.namespace ?? "default",
    name: ctx.object.metadata.name,
    uid: ctx.object.metadata.uid,
    apiVersion: ctx.object.apiVersion,
  };

  // create a temporary directory to work in, which we will clean up at the end
  const workdir = tempdir();
  await fs.cp(sourcedir, workdir, { recursive: true });

  console.log("-------------------------------------------------------------------------------------------");
  const isDeletion = ctx.watchEvent === "Deleted";
  const lastProbeTime = new Date().toISOString();
  const updateReadyCondition = async (ready: boolean, message: string) => patchObjectState(host, objRef, {
    conditions: [{
      type: "Ready",
      status: ready ? "True" : "False",
      lastTransitionTime: new Date().toISOString(),
      lastProbeTime,
      message,
    }]
  });

  let reason: ObjectEvent["reason"];
  switch (ctx.watchEvent) {
    case "Deleted":
      reason = "DELETE";
      break;
    case "Modified":
      reason = "UPDATE";
      break;
    case "Added":
      reason = "CREATE";
      break;
    default:
      reason = "SYNC";
      break;
  }

  host.events.emit({
    type: "OBJECT",
    object: reason === "DELETE" ? {} : ctx.object,
    objRef,
    reason,
  });

  const slackChannel = process.env.SLACK_CHANNEL ?? "kblocks";
  const slackStatus = (icon: string, reason: string) => `${icon} _${objRef.kind}_ *${objRef.namespace}/${objRef.name}*: ${reason}`;
  const slack = await host.newSlackThread(slackChannel, slackStatus("🟡", isDeletion ? "Deleting" : "Updating"));

  try {
    await publishEvent(host, objRef, {
      type: "Normal",
      reason: "UpdateStarted",
      message: "Starting to update resource",
    });

    // resolve references by waiting for the referenced objects to be ready
    await updateReadyCondition(false, "Resolving references");
    ctx.object = await resolveReferences(workdir, host, objRef, ctx.object);
    
    console.log(JSON.stringify(ctx, undefined, 2));

    await updateReadyCondition(false, "In progress");

    const values = path.join(workdir, "values.json");
    await fs.writeFile(values, JSON.stringify(ctx.object));

    const first = engine.split("/")[0];
    let outputs: Record<string, any> = {};
  
    switch (first) {
      case "helm":
        outputs = await applyHelm(workdir, host, ctx, values);
        break;
      case "wing":
        outputs = await applyWing(workdir, host, engine, ctx, values);
        break;
      case "tofu":
        outputs = await applyTofu(workdir, host, ctx, values);
        break;
      case "noop":
        outputs = {};
        break;
      default:
        throw new Error(`unsupported engine: ${engine}`);
    }

    if (Object.keys(outputs).length > 0) {
      await patchObjectState(host, objRef, outputs);
    }

    if (isDeletion) {
      await slack.update(slackStatus("⚪", "Deleted"));
    } else {
      await updateReadyCondition(true, "Success");
      await publishEvent(host, objRef, {
        type: "Normal",
        reason: "UpdateSucceeded",
        message: "Resource updated successfully",
      });

      const outputDesc = [];
      for (const [key, value] of Object.entries(outputs)) {
        outputDesc.push(`*${key}:* ${value}`);
      }

      await slack.update(slackStatus("🟢", `Success 🚀\n${outputDesc.join("\n")}`));
    }
  } catch (err: any) {
    console.error(err.stack);
    await publishEvent(host, objRef, {
      type: "Warning",
      reason: "Error",
      message: err.stack,
    });
    await slack.update(slackStatus("🔴", "Failure"));
    await slack.post(`Requested state:\n\`\`\`${JSON.stringify(ctx.object, undefined, 2).substring(0, 2500)}\`\`\``);
    await slack.post(`Update failed with the following error:\n\`\`\`${err.message}\`\`\``);
    const explanation = await explainError(host, ctx, err.message);

    host.events.emit({
      type: "ERROR",
      message: err.message,
      stack: err.stack,
      explanation,
    });

    if (explanation?.blocks) {
      explanation?.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "✨ _AI-generated_",
        },
      });
      await slack.postBlocks(explanation.blocks);
    }

    await updateReadyCondition(false, "Error");
  } finally {
    if (process.env.DEBUG) {
      console.warn("DEBUG: skipped cleanup of", workdir);
    } else {
      await fs.rm(workdir, { recursive: true, force: true });
    }
  }
}
