import { applyTerraform } from "./tf";
import fs from "fs";
import { getenv, tryGetenv } from "./util";
import { join } from "path";
import type { BindingContext } from "./types";
import { RuntimeContext } from "./host";

export async function applyTofu(workdir: string, host: RuntimeContext, ctx: BindingContext, valuesFile: string): Promise<Record<string, any>> {
  const key = `${getenv("TF_BACKEND_KEY")}-${ctx.object.metadata.namespace}-${ctx.object.metadata.name}`;

  const dynamodb = tryGetenv("TF_BACKEND_DYNAMODB");
  const tableLine = dynamodb ? `dynamodb_table = "${dynamodb}"` : "";

  fs.writeFileSync(join(workdir, "backend.tf"), `
terraform {
  backend "s3" {
    bucket         = "${getenv("TF_BACKEND_BUCKET")}"
    key            = "${key}"
    region         = "${getenv("TF_BACKEND_REGION")}"
    ${tableLine}
  }
}
  `);

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
