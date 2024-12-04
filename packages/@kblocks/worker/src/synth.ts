import fs from "fs/promises";
import path from "path";

import { applyHelm } from "./helm.js";
import { exec, getenv, tempdir, tryGetenv, generateRandomId } from "./util.js";
import { applyWing } from "./wing.js";
import { resolveReferences } from "./refs.js";
import { chatCompletion, explainError } from "./ai.js";
import { applyTofu } from "./tofu.js";
import { publishNotification, RuntimeContext } from "./host.js";
import { BindingContext, InvolvedObject, EventReason, StatusReason, ENGINES, EventType, EventAction } from "@kblocks/api";
import { emitEventAsync } from "@kblocks/common";
import { createLogger } from "./logging.js";
import { newSlackThread } from "./slack.js";
import { applyCdk8s } from "./cdk8s.js";
import { statusUpdater, updateLastStateHash } from "./state.js";
import { applyCustom } from "./custom.js";
import { execRead, hasReadScript } from "./read.js";
import { getResource } from "./resources.js";

export async function synth(sourcedir: string | undefined, engine: keyof typeof ENGINES, plural: string, ctx: BindingContext) {
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

  const isDeletion = ctx.watchEvent === "Deleted";
  const isReading = ctx.watchEvent === "Read";
  const isQuiet = isReading || ctx.binding === "reconcile";
  const objType = `${objRef.apiVersion}/${plural}`;
  const objUri = `kblocks://${objType}/${KBLOCKS_SYSTEM_ID}/${objRef.namespace}/${objRef.name}`;

  // if we are reading but there is no read script, we should just skip the read
  if (isReading && sourcedir && !hasReadScript(sourcedir)) {
    console.log("No read script found, skipping read request");
    return;
  }

  // do not emit logs for read requests (if there will be an error, we will include the info there)
  const requestId = ctx.requestId ?? generateRandomId();
  const logger = createLogger(objUri, objType, requestId, { emitEvent: !isQuiet });

  const host: RuntimeContext = {
    getenv,
    tryGetenv,
    newSlackThread,
    chatCompletion,
    emitEventAsync,
    requestId,
    objUri,
    objType,
    objRef,
    logger,
    system: KBLOCKS_SYSTEM_ID,
    exec: (command, args, options) => exec(logger, command, args, options),
  };

  // create a temporary directory to work in, which we will clean up at the end
  const workdir = tempdir();

  try {
    if (!isDeletion) {
      // fetch the latest object since the message was queued
      ctx.object = await getResource(host);
    }

    console.log("-------------------------------------------------------------------------------------------");
    const lastProbeTime = new Date().toISOString();

    // if we are deleting, we can't update the status at all because the object will be gone
    const statusUpdate = !isDeletion ? statusUpdater(host, ctx.object) : async () => {};
    const updateReadyCondition = async (ready: boolean, reason: StatusReason) => {
      if (isQuiet) {
        return;
      }

      // we use "quiet: true" to avoid logging the status update
      return statusUpdate({
        conditions: [{
          type: "Ready",
          status: ready ? "True" : "False",
          lastTransitionTime: new Date().toISOString(),
          lastProbeTime,
          message: reason,
          reason,
        }]
      }, { quiet: true });
    }

    let eventAction: EventAction;
    switch (ctx.watchEvent) {
      case "Deleted":
        eventAction = EventAction.Delete;
        break;
      case "Modified":
        eventAction = EventAction.Update;
        break;
      case "Added":
        eventAction = EventAction.Create;
        break;
      case "Read":
        eventAction = EventAction.Read;
        break;
      default:
        eventAction = EventAction.Sync;
        break;
    }

    try {
      // for new objects, save the initial state hash for future comparison
      // for modified objects, only save if the state has actually changed
      if (ctx.watchEvent === "Added" || ctx.watchEvent === "Modified") {
        if (!(await updateLastStateHash(statusUpdate, ctx.object))) {
          console.log("skipping status update");
          return;
        }
      }
    } catch (err: any) {
      console.warn(`Error while saving initial state: ${err.message}`);
    }

    if (sourcedir) {
      await fs.cp(sourcedir, workdir, { recursive: true });
    }

    const slackChannel = process.env.SLACK_CHANNEL ?? "kblocks";
    const slackStatus = (icon: string, reason: string) => `${icon} _${objRef.kind}_ *${objRef.namespace}/${objRef.name}*: ${reason}`;

    let slack: Awaited<ReturnType<typeof host.newSlackThread>> | undefined = undefined;
    if (!isQuiet) {
      slack = await host.newSlackThread(slackChannel, slackStatus("🟡", isDeletion ? "Deleting" : "Updating"));
    }

    try {
      // reduce verbosity of the notification for quiet events
      if (!isQuiet) {
        await publishNotification(host, {
          type: EventType.Normal,
          action: eventAction,
          reason: EventReason.Started,
          message: isDeletion ? "Deleting resource" : "Updating resource",
        });
      }

      // resolve references by waiting for the referenced objects to be ready
      ctx.object = await resolveReferences(eventAction, workdir, host, ctx.object);
      console.log(JSON.stringify(ctx)); // one line per object

      await updateReadyCondition(false, StatusReason.InProgress);

      const values = path.join(workdir, "values.json");
      await fs.writeFile(values, JSON.stringify(ctx.object));

      let successString = "";

      if (!isReading) {
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
          case "cdk8s":
            outputs = await applyCdk8s(workdir, host, engine, ctx, values);
            break;
          case "noop":
            outputs = {};
            break;
          case "custom":
            outputs = await applyCustom(workdir, host, ctx, values);
            break;
          default:
            throw new Error(`unsupported engine: ${engine}`);
        }

        if (!isDeletion && Object.keys(outputs).length > 0) {
          await statusUpdate(outputs);
        }

        const outputDesc = [];
        for (const [key, value] of Object.entries(outputs)) {
          outputDesc.push(`*${key}:* ${value}`);
        }
        successString = outputDesc.join("\n");
      } else {
        const status = await execRead(workdir, host, ctx, values);
        if (status) {
          await statusUpdate(status);
        }

        successString = "*Read operation completed*";
      }

      // reduce verbosity of the notification if we are just reading.
      if (!isQuiet) {
        await publishNotification(host, {
          type: EventType.Normal,
          action: eventAction,
          reason: EventReason.Succeeded,
          message: "Completed successfully",
        });
      }

      if (isDeletion) {
        await host.emitEventAsync({
          type: "OBJECT",
          requestId,
          timestamp: new Date(),
          objUri,
          objType,
          object: {},
          reason: eventAction,
        });

        await slack?.update(slackStatus("⚪", "Deleted"));
      } else {
        await updateReadyCondition(true, StatusReason.Completed);
        await slack?.update(slackStatus("🟢", `Success 🚀\n${successString}`));
      }
    } catch (err: any) {
      console.error(err.stack);

      await publishNotification(host, {
        type: EventType.Warning,
        action: eventAction,
        reason: EventReason.Failed,
        message: err.stack,
      });

      // set the ready condition to and indicate that we are in error
      try {
        await updateReadyCondition(false, StatusReason.Error);
      } catch (err: any) {
        console.error(`Error updating ready condition when error occurred: ${err.message}`);
      }

      // try to explain the error with AI
      const explanation = await explainError(host, ctx, err.message, {
        request: ctx,
      });

      // send the explanation as an ERROR event to the backend
      await host.emitEventAsync({
        type: "ERROR",
        objUri,
        requestId,
        objType,
        timestamp: new Date(),
        message: err.message,
        stack: err.stack,
        explanation,
      });

      // slack

      await slack?.update(slackStatus("🔴", "Failure"));
      await slack?.post(`Requested state:\n\`\`\`${JSON.stringify(ctx.object, undefined, 2).substring(0, 2500)}\`\`\``);
      await slack?.post(`Update failed with the following error:\n\`\`\`${err.message}\`\`\``);

      if (explanation?.blocks) {
        explanation?.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: "✨ _Powered by AI_",
          },
        });

        await slack?.postBlocks(explanation.blocks);
      }
    }
  } finally {
    await deleteWorkdir(workdir);
  }
}

async function deleteWorkdir(workdir: string) {
  if (process.env.DEBUG) {
    console.warn("DEBUG: skipped cleanup of", workdir);
  } else {
    await fs.rm(workdir, { recursive: true, force: true });
  }
}
