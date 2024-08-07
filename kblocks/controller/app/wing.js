const { exec, patchStatus, kblockOutputs, getenv, tryGetenv } = require("./util");
const fs = require("fs");
const { applyTerraform } = require("./tf");
const { addOwnerReferences } = require("./ownership");
const { join } = require("path");

async function applyWing(engine, ctx, values) {
  const entrypoint = createEntrypoint(ctx, values);
 
  const [_, target] = engine.split("/");

  try {
    if (!target) {
      await applyWingKubernetes(entrypoint, ctx);
    } else if (target.startsWith("tf-")) {
      await applyWingTerraform(entrypoint, ctx, target);
    } else {
      throw new Error(`unsupported Wing target: ${target}`);
    }
  
  } finally {
    fs.rmSync(entrypoint);
  }
}

async function applyWingTerraform(entrypoint, ctx, target) {
  await exec("wing", ["compile", "-t", target, entrypoint]);
  
  const dir = "target/main.tfaws";
  const tfjson = join(dir, "main.tf.json");
  const tf = JSON.parse(fs.readFileSync(tfjson, "utf8"));

  tf.terraform.backend = {
    s3: {
      bucket: getenv("TF_BACKEND_BUCKET"),
      region: getenv("TF_BACKEND_REGION"),
      key: `${getenv("TF_BACKEND_KEY")}-${ctx.object.metadata.namespace}-${ctx.object.metadata.name}`,
      dynamodb_table: tryGetenv("TF_BACKEND_DYNAMODB"),
    }
  };

  fs.writeFileSync(tfjson, JSON.stringify(tf, null, 2));

  await applyTerraform(ctx, dir);
}

async function applyWingKubernetes(entrypoint, ctx) {
  const obj = ctx.object;
  const objidLabel = "kblock-id";
  const objid = obj.metadata.uid;
  const namespace = obj.metadata.namespace ?? "default";

  const labels = {
    [objidLabel]: objid,
    "kblock/api-version": obj.apiVersion.replace("/", "-"),
    "kblock/kind": obj.kind,
    "kblock/name": obj.metadata.name,
    ...obj.metadata.labels,
  };

  const env = {
    WING_K8S_LABELS: JSON.stringify(labels),
    WING_K8S_NAMESPACE: namespace,
  };

  await exec("wing", ["compile", "-t", "@winglibs/k8s", entrypoint], { env });

  // add owner references to the generated manifest
  const manifest = addOwnerReferences(ctx.object, "target/main.k8s", "manifest.yaml");
 
  // if we receive a delete event, we delete all resources marked with the object id label. this is
  // more robust than synthesizing the manifest and deleting just the resources within the manifest
  // because the manifest may have changed since the last apply.
  if (ctx.watchEvent === "Deleted") {
    await exec("kubectl", [
      "delete",
      "--ignore-not-found",
      "-f", manifest,
    ]);
    return;
  }
 
  // update the "status" field of the object with the outputs from the Wing program
  const outputs = JSON.parse(fs.readFileSync("./outputs.json", "utf8"));
  await patchStatus(ctx.object, outputs);

  await exec("kubectl", [
    "apply", 
    "--prune",
    "--selector", `${objidLabel}=${objid}`,
    "-f", manifest]
  );
}

function createEntrypoint(ctx, values) {
  const entrypoint = "main.w";
  const obj = ctx.object;

  const code = [
    `bring "." as lib;`,
    `bring fs;`,
    `let json = fs.readJson("${values}");`,
    `let spec = lib.${obj.kind}Spec.fromJson(json);`,
    `let obj = new lib.${obj.kind}(spec) as \"${obj.metadata.name}\";`,
  ];

  const outputs = kblockOutputs();
  code.push(`let outputs = {`);

  for (const name of outputs) {
    code.push(`"${name}": obj.${name},`);
  }

  code.push(`};`);

  code.push(`fs.writeJson("outputs.json", outputs);`);

  fs.writeFileSync(entrypoint, code.join("\n"));

  return entrypoint;
}


exports.applyWing = applyWing;
