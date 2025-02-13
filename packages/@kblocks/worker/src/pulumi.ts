import type { BindingContext } from "@kblocks/api";
import { RuntimeContext } from "./host.js";

export async function applyPulumi(workdir: string, host: RuntimeContext, engine: string, ctx: BindingContext, values: string): Promise<Record<string, any>> {
  try {
    await host.exec("pulumi", [
      "stack", "init",
      `${host.system}-${ctx.object.metadata.namespace}-${ctx.object.metadata.name}`
    ], { cwd: workdir });
  } catch (e) {
    await host.exec("pulumi", [
      "stack", "select",
      `${host.system}-${ctx.object.metadata.namespace}-${ctx.object.metadata.name}`
    ], { cwd: workdir });
  }

  if (ctx.watchEvent == "Deleted") {
    await host.exec("pulumi", [
      "destroy", "--yes"
    ], { cwd: workdir });

    return {};
  }

  const args = [];
  for (const prop of Object.keys(ctx.object)) {
    // if prop is a primitive value, add it as a --config
    if (typeof ctx.object[prop] === "string" || typeof ctx.object[prop] === "number" || typeof ctx.object[prop] === "boolean") {
      args.push("--config", `${prop}=${ctx.object[prop]}`);
    }
  }

 await host.exec("pulumi", ["up", "--yes", ...args], {
    cwd: workdir,
    env: {
      ...process.env,
      KBLOCKS_VALUES_FILE: values,
    },
    mergedOutput: true,
  });

  let outputs;
  try {
    outputs = await host.exec("pulumi", [
      "stack", "output", "--json"
    ], { cwd: workdir });
    return JSON.parse(outputs);
  } catch (e) {
    console.error("failed to parse outputs", outputs, e)
    return  {};
  }
}
