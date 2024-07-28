const { exec } = require("./util");
const fs = require("fs");
const crypto = require("crypto");

async function applyWing(ctx, values) {
  const obj = ctx.object;
  const entrypoint = "main.w";

  fs.writeFileSync(entrypoint, `
    bring "." as lib;
    bring fs;
    let json = fs.readJson("${values}");
    let spec = lib.${obj.kind}Spec.fromJson(json);
    new lib.${obj.kind}(spec) as \"${obj.metadata.name}\";
  `);

  const objidLabel = "wing.cloud/object-id";
  const objid = crypto.createHash('md5').update(`${obj.apiVersion}-${obj.kind}-${obj.metadata.name}`).digest('hex');
  const namespace = obj.metadata.namespace ?? "default";

  const labels = {
    [objidLabel]: objid,
    "wing.cloud/api-version": obj.apiVersion.replace("/", "-"),
    "wing.cloud/kind": obj.kind,
    "wing.cloud/name": obj.metadata.name,
    ...obj.metadata.labels,
  };

  // if we receive a delete event, we delete all resources marked with the object id label. this is
  // more robust than synthesizing the manifest and deleting just the resources within the manifest
  // because the manifest may have changed since the last apply.
  if (ctx.watchEvent === "Deleted") {
    await exec("kubectl", [
      "delete", "all", 
      "-l", `${objidLabel}=${objid}`, 
      "-n", namespace
    ]);

    return;
  }

  await exec("wing", ["compile", "-t", "@winglibs/k8s", entrypoint], {
    env: { WING_K8S_LABELS: JSON.stringify(labels) } 
  });

  await exec("kubectl", ["apply", 
    "--prune",
    "--selector", `${objidLabel}=${objid}`,
    "-n", namespace, 
    "-f", "target/main.k8s/*.yaml"]
  );

  fs.rmSync(entrypoint);
}

exports.applyWing = applyWing;