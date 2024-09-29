import fs from "fs/promises";
import path from "path";
import { applyHelm } from "./helm.js";
import { exec, getenv, tempdir, tryGetenv } from "./util.js";
import { applyWing } from "./wing.js";
import { resolveReferences } from "./refs.js";
import { chatCompletion, explainError } from "./ai.js";
import { applyTofu } from "./tofu.js";
import { patchObjectState, publishEvent, RuntimeContext } from "./host.js";
import { BindingContext, InvolvedObject, ObjectEvent } from "./types/index.js";
import { createLogger } from "./logging.js";
import { newSlackThread } from "./slack.js";
import { Events } from "./http.js";

export async function synth(sourcedir: string, engine: string, ctx: BindingContext, events: Events) {
  // skip updates to the "status" subresource
  if (ctx.watchEvent === "Modified") {
    const managedFields = ctx.object.metadata?.managedFields ?? [];
    const last = managedFields.length > 0 ? managedFields[managedFields.length - 1] : undefined;
    if (last?.subresource === "status") {
      return;
    }
  }

  const KBLOCKS_SYSTEM_ID = process.env.KBLOCKS_SYSTEM_ID;
  if (!KBLOCKS_SYSTEM_ID) {
    throw new Error("KBLOCKS_SYSTEM_ID is not set");
  }

  const objRef: InvolvedObject = {
    apiVersion: ctx.object.apiVersion,
    kind: ctx.object.kind,
    namespace: ctx.object.metadata.namespace ?? "default",
    name: ctx.object.metadata.name,
    uid: ctx.object.metadata.uid,
  };

  const objType = `${objRef.apiVersion}/${objRef.kind.toLocaleLowerCase()}`;
  const objUri = `kblocks://${objType}/${KBLOCKS_SYSTEM_ID}/${objRef.namespace}/${objRef.name}`;

  const logger = createLogger(events, objUri, objType);

  const host: RuntimeContext = {
    getenv,
    tryGetenv,
    newSlackThread,
    chatCompletion,
    events,
    objUri,
    objType,
    objRef,
    logger,
    exec: (command, args, options) => exec(logger, command, args, options),
  };

  // create a temporary directory to work in, which we will clean up at the end
  const workdir = tempdir();
  await fs.cp(sourcedir, workdir, { recursive: true });

  console.log("-------------------------------------------------------------------------------------------");
  const isDeletion = ctx.watchEvent === "Deleted";
  const lastProbeTime = new Date().toISOString();
  const updateReadyCondition = async (ready: boolean, message: string) => patchObjectState(host, {
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

  if (reason !== "DELETE") {
    host.events.emit({
      type: "OBJECT",
      objUri,
      objType,
      object: ctx.object,
      reason,
    });
  }

  const slackChannel = process.env.SLACK_CHANNEL ?? "kblocks";
  const slackStatus = (icon: string, reason: string) => `${icon} _${objRef.kind}_ *${objRef.namespace}/${objRef.name}*: ${reason}`;
  const slack = await host.newSlackThread(slackChannel, slackStatus("🟡", isDeletion ? "Deleting" : "Updating"));

  try {
    await publishEvent(host, {
      type: "Normal",
      reason: "UpdateStarted",
      message: "Starting to update resource",
    });

    // resolve references by waiting for the referenced objects to be ready
    await updateReadyCondition(false, "Resolving references");
    ctx.object = await resolveReferences(workdir, host, ctx.object);
    console.log(JSON.stringify(ctx)); // one line per object

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
      await patchObjectState(host, outputs);
    }

    if (isDeletion) {
      await slack.update(slackStatus("⚪", "Deleted"));
      
      // only emit when we are done because this will cause the object to be emptied.
      host.events.emit({
        type: "OBJECT",
        objUri,
        objType,
        object: {},
        reason,
      });
    } else {
      await updateReadyCondition(true, "Success");
      await publishEvent(host, {
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
    await publishEvent(host, {
      type: "Warning",
      reason: "Error",
      message: err.stack,
    });
    await slack.update(slackStatus("🔴", "Failure"));
    await slack.post(`Requested state:\n\`\`\`${JSON.stringify(ctx.object, undefined, 2).substring(0, 2500)}\`\`\``);
    await slack.post(`Update failed with the following error:\n\`\`\`${err.message}\`\`\``);
    const explanation = await explainError(host, ctx, err.message);

    host.events.emit({
      objUri,
      objType,
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
          text: "✨ _Powered by AI_",
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
