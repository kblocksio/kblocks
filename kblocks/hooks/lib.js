const fs = require("fs");
const { exec, setConditions } = require("./util");
const { applyHelm } = require("./helm");
const { applyWing } = require("./wing");

async function synth(engine, ctx) {
  const obj = ctx.object;

  // skip updates to the "status" subresource
  if (ctx.type !== "Synchronization") {
    const managedFields = obj.metadata?.managedFields ?? [];
    const last = managedFields.length > 0 ? managedFields[managedFields.length - 1] : undefined;
    if (last?.subresource === "status") {
      console.error("ignoring 'status' update");
      return;
    }
  }

  console.error(JSON.stringify(obj, null, 2));

  const probeTime = new Date().toISOString();

  await setConditions(obj, [{
    lastTransitionTime: new Date().toISOString(),
    status: true,
    lastProbeTime: probeTime,
    type: "Progressing",
  }]);

  try {
    const values = "values.json";
    fs.writeFileSync(values, JSON.stringify(obj));

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

    await setConditions(obj, [{
      lastTransitionTime: new Date().toISOString(),
      status: true,
      lastProbeTime: probeTime,
      type: "Ready",
    }]);
    
  } catch (err) {
    await setConditions(obj, [{
      lastTransitionTime: new Date().toISOString(),
      status: true,
      lastProbeTime: probeTime,
      type: "Error",
      message: err.stack,
    }]);
  }
}

exports.synth = synth;
