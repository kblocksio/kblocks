const { exec, patchStatus, kblockOutputs } = require("./util");
const fs = require("fs");
const { applyTerraform } = require("./tf");

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
  await applyTerraform(ctx, "target/main.tfaws");
}

async function applyWingKubernetes(entrypoint, ctx) {
  const obj = ctx.object;
  const objidLabel = "kblock-id";
  const objid = obj.metadata.uid;

  // if we receive a delete event, we delete all resources marked with the object id label. this is
  // more robust than synthesizing the manifest and deleting just the resources within the manifest
  // because the manifest may have changed since the last apply.
  if (ctx.watchEvent === "Deleted") {
    await exec("kubectl", [
      "delete", "all",
      "--all-namespaces",
      "-l", `${objidLabel}=${objid}`, 
    ]);

    return;
  }

  const labels = {
    [objidLabel]: objid,
    "kblock/api-version": obj.apiVersion.replace("/", "-"),
    "kblock/kind": obj.kind,
    "kblock/name": obj.metadata.name,
    ...obj.metadata.labels,
  };


  console.error(fs.readFileSync(entrypoint, "utf-8"));

  await exec("wing", ["compile", "-t", "@winglibs/k8s", entrypoint], {
    env: { WING_K8S_LABELS: JSON.stringify(labels) } 
  });

  const outputs = JSON.parse(fs.readFileSync("./outputs.json", "utf8"));
  await patchStatus(ctx.object, outputs);

  await exec("kubectl", ["apply", 
    "--prune",
    "--selector", `${objidLabel}=${objid}`,
    "-f", "target/main.k8s/*.yaml"]
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