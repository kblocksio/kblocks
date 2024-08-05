const fs = require("fs");
const { patchStatus, publishEvent } = require("./util");
const { applyHelm } = require("./helm");
const { applyWing } = require("./wing");
const { resolveReferences } = require("./refs");
const { newSlackThread } = require("./slack");

async function synth(engine, ctx) {

  // skip updates to the "status" subresource
  if (ctx.watchEvent === "Modified") {
    const managedFields = ctx.object.metadata?.managedFields ?? [];
    const last = managedFields.length > 0 ? managedFields[managedFields.length - 1] : undefined;
    if (last?.subresource === "status") {
      console.error("ignoring 'status' update");
      return;
    }
  }

  const lastProbeTime = new Date().toISOString();
  const updateReadyCondition = async (ready, message) => patchStatus(ctx.object, {
    conditions: [{
      type: "Ready",
      status: ready ? "True" : "False",
      lastTransitionTime: new Date().toISOString(),
      lastProbeTime,
      message,
    }]
  });

  const slackChannel = process.env.SLACK_CHANNEL ?? "kblocks";
  const slackStatus = (icon, reason) => `${icon} *${ctx.object.metadata.namespace ?? "default"}/${ctx.object.metadata.name}* (_${ctx.object.kind}_): ${reason}`;
  const slack = await newSlackThread(slackChannel, slackStatus("🟡", "Updating"));

  try {
    await slack.post(`New desired state\n\`\`\`${JSON.stringify(ctx.object, undefined, 2).substring(0, 2500)}\`\`\``);
    
    await publishEvent(ctx.object, {
      type: "Normal",
      reason: "UpdateStarted",
      message: "Starting to update resource",
    });

    // resolve references by waiting for the referenced objects to be ready
    await updateReadyCondition(false, "Resolving references");
    ctx.object = await resolveReferences(ctx.object);
    
    console.error(JSON.stringify(ctx, undefined, 2));

    await updateReadyCondition(false, "Update in progress");

    const values = "values.json";
    fs.writeFileSync(values, JSON.stringify(ctx.object));

    const first = engine.split("/")[0];
  
    switch (first) {
      case "helm":
        await applyHelm(ctx, values);
        break;
      case "wing":
        await applyWing(engine, ctx, values);
        break;
      default:
        throw new Error(`unsupported engine: ${engine}`);
    }

    await updateReadyCondition(true, "Update succeeded");
    await slack.update(slackStatus("🟢", "Success"));
    await slack.post(`Resource updated successfully 🚀`);

    await publishEvent(ctx.object, {
      type: "Normal",
      reason: "UpdateSucceeded",
      message: "Resource updated successfully",
    });

  } catch (err) {
    console.error(err.stack);

    await publishEvent(ctx.object, {
      type: "Warning",
      reason: "UpdateFailed",
      message: err.stack,
    });

    await slack.update(slackStatus("🔴", "Failure"));
    await slack.post(`Update failed with the following error:\n\`\`\`${err.stack}\`\`\``);

    await updateReadyCondition(false, "Update failed");
  }
}

exports.synth = synth;

