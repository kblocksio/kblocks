import { kblockOutputs, RuntimeContext } from "./host.js";
import { BindingContext, TFSTATE_ATTRIBUTE } from "@kblocks/api";
import fs from "fs/promises";
import { join } from "path";

export async function applyTerraform(engine: "tofu" | "terraform", host: RuntimeContext, workdir: string, ctx: BindingContext): Promise<Record<string, any>> {
  const tfstatefile = join(workdir, "terraform.tfstate");

  // if there is a "tfstate" in the status, materialize it into the tfstate file so it will be used by the engine
  const prevState = ctx.object.status?.[TFSTATE_ATTRIBUTE];
  if (prevState) {
    host.logger.debug(`previous tfstate: ${prevState}`);
    await fs.writeFile(tfstatefile, prevState);
  }

  await host.exec(engine, ["init", "-input=false", "-lock=false", "-no-color"], { cwd: workdir });

  if (ctx.watchEvent === "Deleted") {
    await host.exec(engine, ["destroy", "-auto-approve", "-no-color"], { cwd: workdir });
    return {};
  }

  await host.exec(engine, ["apply", "-input=false", "-auto-approve", "-no-color"], { cwd: workdir });

  const outputs = kblockOutputs(host);
  const results: Record<string, any> = {};
  for (const name of outputs) {
    const value = await host.exec(engine, ["output", "-no-color", name], { cwd: workdir });
    try {
      results[name] = JSON.parse(value);
      host.logger.info(`Output: ${name}=${value}`);
    } catch (e) {
      host.logger.debug(`No outputs found.`);
    }
  }

  // if there's a `terraform.tfstate` file, store it's contents in the k8s status so it can be used
  // as a previous state in subsequent apply calls.
  try {
    await fs.access(tfstatefile, fs.constants.R_OK);
    results[TFSTATE_ATTRIBUTE] = await fs.readFile(tfstatefile, "utf8");
    host.logger.debug("new tfstate: " + JSON.stringify(JSON.parse(results[TFSTATE_ATTRIBUTE]), null, 2));
  } catch (e) { }

  return results;
}

/**
 * Try to get the Terraform S3 backend configuration from the environment variables.
 * If the environment variables are not set, return undefined.
 * 
 * @param host - The runtime context.
 * @param ctx - The binding context.
 * @returns The Terraform S3 backend configuration or undefined if the environment variables are not set.
 */
export function tryGetTerraformS3Backend(host: RuntimeContext, ctx: BindingContext) {
  // if the backend bucket is set, we configure the Terraform backend to use it
  const bucket = host.tryGetenv("TF_BACKEND_BUCKET");
  if (!bucket) {
    return undefined;
  }

  const key = `${host.getenv("TF_BACKEND_KEY")}/${host.system}/${ctx.object.kind}/${ctx.object.metadata.namespace}/${ctx.object.metadata.name}`;
  const region = host.getenv("TF_BACKEND_REGION");
  const dynamodb_table = host.tryGetenv("TF_BACKEND_DYNAMODB");

  return {
    bucket,
    region,
    key,
    dynamodb_table,
  };
}