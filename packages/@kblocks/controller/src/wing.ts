import fs from "fs";
import path from "path";
import { applyTerraform } from "./tf";
import { addOwnerReferences } from "./ownership";
import { join } from "path";
import type { BindingContext } from "./types";
import { kblockOutputs, patchStatus, RuntimeHost } from "./host";
import { exec as realExec } from "./util"
import type { SpawnOptions } from "child_process";

export async function applyWing(workdir: string, host: RuntimeHost, engine: string, ctx: BindingContext, values: string) {
  const entrypoint = createEntrypoint(workdir, host, ctx, values);
  const [_, target] = engine.split("/");

  if (!target) {
    await applyWingKubernetes(workdir, host, entrypoint, ctx);
  } else if (target.startsWith("tf-")) {
    await applyWingTerraform(workdir, host, entrypoint, ctx, target);
  } else {
    throw new Error(`unsupported Wing target: ${target}`);
  }
}

async function applyWingTerraform(workdir: string, host: RuntimeHost, entrypoint: string, ctx: BindingContext, target: string) {
  await wingcli(["compile", "-t", target, entrypoint], { cwd: workdir });
  
  const tmpdir = "target/main.tfaws";
  const tfjson = join(tmpdir, "main.tf.json");
  const tf = JSON.parse(fs.readFileSync(tfjson, "utf8"));

  tf.terraform.backend = {
    s3: {
      bucket: host.getenv("TF_BACKEND_BUCKET"),
      region: host.getenv("TF_BACKEND_REGION"),
      key: `${host.getenv("TF_BACKEND_KEY")}-${ctx.object.metadata.namespace}-${ctx.object.metadata.name}`,
      dynamodb_table: host.tryGetenv("TF_BACKEND_DYNAMODB"),
    }
  };

  fs.writeFileSync(tfjson, JSON.stringify(tf, null, 2));

  await applyTerraform(host, tmpdir, ctx);
}

async function applyWingKubernetes(workdir: string, host: RuntimeHost, entrypoint: string, ctx: BindingContext) {
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

  await wingcli(["compile", "-t", "@winglibs/k8s", entrypoint], { env, cwd: workdir });

  // add owner references to the generated manifest
  const manifest = addOwnerReferences(ctx.object, path.join(workdir, "target/main.k8s"), path.join(workdir, "manifest.yaml"));
 
  // if we receive a delete event, we delete all resources marked with the object id label. this is
  // more robust than synthesizing the manifest and deleting just the resources within the manifest
  // because the manifest may have changed since the last apply.
  if (ctx.watchEvent === "Deleted") {
    await host.exec("kubectl", [
      "delete",
      "--ignore-not-found",
      "-f", manifest,
    ], { cwd: workdir });
    return;
  }
 
  // update the "status" field of the object with the outputs from the Wing program
  const outputs = JSON.parse(fs.readFileSync(path.join(workdir, "./outputs.json"), "utf8"));
  await patchStatus(host, ctx.object, outputs);

  await host.exec("kubectl", [
    "apply", 
    "--prune",
    "--selector", `${objidLabel}=${objid}`,
    "-f", manifest]
  , { cwd: workdir });
}

function createEntrypoint(workdir: string, host: RuntimeHost, ctx: BindingContext, valuesFile: string) {
  const entrypoint = path.join(workdir, "main.w");
  const obj = ctx.object;

  const code = [
    `bring "." as lib;`,
    `bring fs;`,
    `let json = fs.readJson("${valuesFile}");`,
    `let spec = lib.${obj.kind}Spec.fromJson(json);`,
    `let obj = new lib.${obj.kind}(spec) as \"${obj.metadata.name}\";`,
  ];

  const outputs = kblockOutputs(host);
  code.push(`let outputs = {`);

  for (const name of outputs) {
    code.push(`"${name}": obj.${name},`);
  }

  code.push(`};`);
  code.push(`fs.writeJson("outputs.json", outputs);`);

  fs.writeFileSync(entrypoint, code.join("\n"));

  return entrypoint;
}

async function wingcli(args: string[], options: SpawnOptions = {}) {
  return await realExec("wing", args, options);
}