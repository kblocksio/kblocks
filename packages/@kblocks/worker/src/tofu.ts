import fs from "fs";
import { join } from "path";
import { applyTerraform } from "./tf.js";
import type { BindingContext } from "./api/index.js";
import { RuntimeContext } from "./host.js";

export async function applyTofu(workdir: string, host: RuntimeContext, ctx: BindingContext, valuesFile: string): Promise<Record<string, any>> {

  // configure the backend if TF_BACKEND_BUCKET is set
  const backendBucket = host.tryGetenv("TF_BACKEND_BUCKET");
  if (backendBucket) {
    const key = renderTerraformStateKey(host, ctx);
    const dynamodb = host.tryGetenv("TF_BACKEND_DYNAMODB");
    const tableLine = dynamodb ? `dynamodb_table = "${dynamodb}"` : "";

    fs.writeFileSync(join(workdir, "backend.tf"), `
terraform {
  backend "s3" {
    bucket         = "${backendBucket}"
    key            = "${key}"
    region         = "${host.getenv("TF_BACKEND_REGION")}"
    ${tableLine}
  }
}
    `);

    host.logger.info(`Terraform S3 backend: ${backendBucket}/${key}`);
  } else {
    host.logger.info("Terraform S3 backend not configured, using Kubernetes as backend");
  }

  const values = JSON.parse(fs.readFileSync(valuesFile, "utf-8"));

  delete values.metadata;
  delete values.apiVersion;
  delete values.kind;
  delete values.status;

  const tfvars = [];
  for (const [key, value] of Object.entries(values)) {
    tfvars.push(`${key} = ${JSON.stringify(value)}`);
  }
  
  fs.writeFileSync(join(workdir, "terraform.tfvars"), tfvars.join("\n"));
  return await applyTerraform(host, workdir, ctx);
}

export function renderTerraformStateKey(host: RuntimeContext, ctx: BindingContext) {
  return `${host.getenv("TF_BACKEND_KEY")}/${host.system}/${ctx.object.kind}/${ctx.object.metadata.namespace}/${ctx.object.metadata.name}`;
}
