const fs = require("fs");
const { exec } = require("./util");
const { applyHelm } = require("./helm");
const { applyWing } = require("./wing");

async function synth(engine, ctx) {
  const obj = ctx.object;

  await updateEvent(obj, "Normal", "Updating...");
  try {
    const values = "values.json";
    fs.writeFileSync(values, JSON.stringify(obj));
  
    switch (engine) {
      case "helm":
        await applyHelm(ctx, values);
        break;
      case "wing":
        await applyWing(ctx, values);
        break;
      default:
        throw new Error(`unsupported engine: ${engine}`);
    }
    await updateEvent(obj, "Normal", "OK");
  } catch (err) {
    await updateEvent(obj, "Warning", err.stack);
  }
}

async function updateEvent(obj, type, message) {
  const namespace = obj.metadata.namespace ?? "default";
  const id = obj.metadata.uid;

  fs.writeFileSync("event.json", JSON.stringify({
    apiVersion: "v1",
    kind: "Event",
    metadata: {
      name: `wing-${id}`,
      namespace
    },
    involvedObject: {
      kind: obj.kind,
      namespace,
      name: obj.metadata.name,
      uid: obj.metadata.uid,
      apiVersion: obj.apiVersion,
    },
    firstTimestamp: new Date().toISOString(),
    reportingComponent: "wing.cloud/operator",
    reportingInstance: `${obj.apiVersion}/${obj.kind}`,
    message,
    type,
    action: "Apply",
    reason: "Status"
  }));

  try {
    await exec("kubectl", ["apply", "-f", "event.json"]);
  } catch (err) {
    console.error("error creating event:", err.stack);
  }
}

exports.synth = synth;
