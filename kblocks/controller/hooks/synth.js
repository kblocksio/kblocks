const fs = require("fs");
const { patchStatus } = require("./util");
const { applyHelm } = require("./helm");
const { applyWing } = require("./wing");
const { resolveReferences } = require("./refs");

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


  try {
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
    
  } catch (err) {
    await updateReadyCondition(false, err.stack);
    throw err; // re-throw to mark the hook as failed
  }
}

exports.synth = synth;

