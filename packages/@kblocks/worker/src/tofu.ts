import fs from "fs";
import { join } from "path";
import { applyTerraform, tryGetTerraformS3Backend } from "./tf.js";
import type { BindingContext } from "@kblocks/api";
import { RuntimeContext } from "./host.js";

export async function applyTofuOrTerraform(engine: "tofu" | "terraform", workdir: string, host: RuntimeContext, ctx: BindingContext, valuesFile: string): Promise<Record<string, any>> {
  const s3Backend = tryGetTerraformS3Backend(host, ctx);
  if (s3Backend) {
    const dynamodb = s3Backend.dynamodb_table;
    const tableLine = dynamodb ? `dynamodb_table = "${dynamodb}"` : "";

    fs.writeFileSync(join(workdir, "backend.tf"), `
terraform {
  backend "s3" {
    bucket         = "${s3Backend.bucket}"
    key            = "${s3Backend.key}"
    region         = "${s3Backend.region}"
    ${tableLine}
  }
}
    `);

    host.logger.info(`Terraform S3 backend: ${JSON.stringify(s3Backend)}`);
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
  return await applyTerraform(engine, host, workdir, ctx);
}


