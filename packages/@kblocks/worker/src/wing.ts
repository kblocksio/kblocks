import fs from "fs";
import path from "path";
import { join } from "path";
import type { SpawnOptions } from "child_process";
import { applyTerraform, tryGetTerraformS3Backend } from "./tf.js";
import { addOwnerReferences } from "./ownership.js";
import type { BindingContext } from "@kblocks/api";
import { kblockOutputs, RuntimeContext } from "./host.js";

export async function applyWing(workdir: string, host: RuntimeContext, engine: string, ctx: BindingContext, values: string): Promise<Record<string, any>> {
  const [_, target] = engine.split("/");

  if (!target || target === "k8s") {
    return await applyWingKubernetes(workdir, host, values, ctx);
  } else if (target.startsWith("tf-")) {
    return await applyWingTerraform(workdir, host, values, ctx, target);
  } else {
    throw new Error(`unsupported Wing target: ${target}`);
  }
}

async function applyWingTerraform(workdir: string, host: RuntimeContext, values: string, ctx: BindingContext, target: string): Promise<Record<string, any>> {
  const entrypoint = createEntrypoint(workdir, host, ctx, values, false);
  await wingcli(host, ["compile", "-t", target, entrypoint], { cwd: workdir });
  
  const targetdir = join(workdir, "target/main.tfaws");

  // if the backend bucket is set, we configure the Terraform backend to use it
  const s3Backend = tryGetTerraformS3Backend(host, ctx);
  if (s3Backend) {
    const tfjson = join(targetdir, "main.tf.json");
    const tf = JSON.parse(fs.readFileSync(tfjson, "utf8"));
    
    tf.terraform.backend = { 
      s3: s3Backend
    };
    
    fs.writeFileSync(tfjson, JSON.stringify(tf, null, 2));
    host.logger.info(`Terraform S3 backend: ${JSON.stringify(tf.terraform.backend, null, 2)}`);
  } else {
    host.logger.info("Terraform S3 backend not configured, using Kubernetes as backend");
  }

  return await applyTerraform("tofu", host, targetdir, ctx);
}

async function applyWingKubernetes(workdir: string, host: RuntimeContext, values: string, ctx: BindingContext): Promise<Record<string, any>> {
  const entrypoint = createEntrypoint(workdir, host, ctx, values, true);
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

  await wingcli(host, ["compile", "-t", "@winglibs/k8s", entrypoint], { env, cwd: workdir });

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

    return {};
  }
 
  // update the "status" field of the object with the outputs from the Wing program
  const outputs = JSON.parse(fs.readFileSync(path.join(workdir, "./outputs.json"), "utf8"));

  await host.exec("kubectl", [
    "apply", 
    "--prune",
    "--selector", `${objidLabel}=${objid}`,
    "-f", manifest]
  , { cwd: workdir });

  return outputs;
}

function createEntrypoint(workdir: string, host: RuntimeContext, ctx: BindingContext, valuesFile: string, withOutputs: boolean) {
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

  if (withOutputs) {
    code.push(`let outputs = {`);

    for (const name of outputs) {
      code.push(`"${name}": obj.${name},`);
    }

    code.push(`};`);
    code.push(`fs.writeJson("outputs.json", outputs);`);
  }

  fs.writeFileSync(entrypoint, code.join("\n"));

  return entrypoint;
}

async function wingcli(host: RuntimeContext, args: string[], options: SpawnOptions = {}) {
  return await host.exec("wing", args, options);
}