import { kblockOutputs, RuntimeContext } from "./host.js";
import type { BindingContext } from "./api/index.js";

export async function applyTerraform(host: RuntimeContext, workdir: string, ctx: BindingContext): Promise<Record<string, any>> {
  await host.exec("tofu", ["init", "-input=false", "-lock=false", "-no-color"], { cwd: workdir });

  if (ctx.watchEvent === "Deleted") {
    await host.exec("tofu", ["destroy", "-auto-approve", "-no-color"], { cwd: workdir });
    return {};
  }

  await host.exec("tofu", ["apply", "-input=false", "-auto-approve", "-no-color"], { cwd: workdir });

  const outputs = kblockOutputs(host);
  const results: Record<string, any> = {};
  for (const name of outputs) {
    const value = await host.exec("tofu", ["output", "-no-color", name], { cwd: workdir });
    try {
      results[name] = JSON.parse(value);
      console.error(`OUTPUT! ${name}=${value}`);
    } catch (e) {
      console.error(`No outputs found.`);
    }
  }

  return results;
}
