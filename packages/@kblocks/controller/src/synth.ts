import fs from "fs/promises";
import path from "path";
import { applyHelm } from "./helm";
import { tempdir } from "./util";
import { applyWing } from "./wing";
import { resolveReferences } from "./refs";
import { explainError } from "./ai";
import { applyTofu } from "./tofu";
import { patchStatus, publishEvent, RuntimeHost } from "./host";
import { BindingContext } from "./types";

export async function synth(sourcedir: string, host: RuntimeHost, engine: string, ctx: BindingContext) {
  // skip updates to the "status" subresource
  if (ctx.watchEvent === "Modified") {
    const managedFields = ctx.object.metadata?.managedFields ?? [];
    const last = managedFields.length > 0 ? managedFields[managedFields.length - 1] : undefined;
    if (last?.subresource === "status") {
      return;
    }
  }

  // create a temporary directory to work in, which we will clean up at the end
  const workdir = tempdir();
  await fs.cp(sourcedir, workdir, { recursive: true });

  console.error("-------------------------------------------------------------------------------------------");
  const isDeletion = ctx.watchEvent === "Deleted";
  const lastProbeTime = new Date().toISOString();
  const updateReadyCondition = async (ready: boolean, message: string) => patchStatus(host, ctx.object, {
    conditions: [{
      type: "Ready",
      status: ready ? "True" : "False",
      lastTransitionTime: new Date().toISOString(),
      lastProbeTime,
      message,
    }]
  });

  const slackChannel = process.env.SLACK_CHANNEL ?? "kblocks";
  const slackStatus = (icon: string, reason: string) => `${icon} _${ctx.object.kind}_ *${ctx.object.metadata.namespace ?? "default"}/${ctx.object.metadata.name}*: ${reason}`;
  const slack = await host.newSlackThread(slackChannel, slackStatus("🟡", isDeletion ? "Deleting" : "Updating"));

  try {
    await publishEvent(host, ctx.object, {
      type: "Normal",
      reason: "UpdateStarted",
      message: "Starting to update resource",
    });

    // resolve references by waiting for the referenced objects to be ready
    await updateReadyCondition(false, "Resolving references");
    ctx.object = await resolveReferences(workdir, host, ctx.object);
    
    console.error(JSON.stringify(ctx, undefined, 2));

    await updateReadyCondition(false, "In progress");

    const values = path.join(workdir, "values.json");
    await fs.writeFile(values, JSON.stringify(ctx.object));

    const first = engine.split("/")[0];
  
    switch (first) {
      case "helm":
        await applyHelm(workdir, host, ctx, values);
        break;
      case "wing":
        await applyWing(workdir, host, engine, ctx, values);
        break;
      case "tofu":
        await applyTofu(workdir, host, ctx, values);
        break;
      default:
        throw new Error(`unsupported engine: ${engine}`);
    }

    if (isDeletion) {
      await slack.update(slackStatus("⚪", "Deleted"));
    } else {
      await updateReadyCondition(true, "Success");
      await publishEvent(host, ctx.object, {
        type: "Normal",
        reason: "UpdateSucceeded",
        message: "Resource updated successfully",
      });  
      await slack.update(slackStatus("🟢", "Success 🚀"));
    }
  } catch (err: any) {
    console.error(err.stack);
    await publishEvent(host, ctx.object, {
      type: "Warning",
      reason: "Error",
      message: err.stack,
    });
    await slack.update(slackStatus("🔴", "Failure"));
    await slack.post(`Requested state:\n\`\`\`${JSON.stringify(ctx.object, undefined, 2).substring(0, 2500)}\`\`\``);
    await slack.post(`Update failed with the following error:\n\`\`\`${err.message}\`\`\``);
    const explanation = await explainError(host, ctx, err.message);
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
      console.error("DEBUG: skipped cleanup of", workdir);
    } else {
      await fs.rm(workdir, { recursive: true, force: true });
    }
  }
}
