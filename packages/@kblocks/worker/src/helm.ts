import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { RuntimeContext } from "./host.js";
import type { BindingContext } from "./types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const postRenderPath = resolve(__dirname, "./helm-add-ownership");

export async function applyHelm(dir: string, host: RuntimeContext, ctx: BindingContext, values: string): Promise<Record<string, any>> {
  const obj = ctx.object;

  const namespace = obj.metadata.namespace ?? "default";
  const release = obj.metadata.name;

  if (ctx.watchEvent == "Deleted") {
    await host.exec("helm", [
      "uninstall", release, 
      "--namespace", namespace
    ], { cwd: dir });

    return {};
  }

  // verify schema
  await host.exec("helm", [
    "lint", 
    ".", 
    "--values", values
  ], { cwd: dir });

  // install/upgrade
  const output = await host.exec("helm", [
    "upgrade",
    release, ".", 
    "--namespace", namespace,
    "--create-namespace",
    "--install",
    "--wait",
    "--timeout=5m",
    "--reset-values",
    "--values", values,
    "--output", "json",
    "--post-renderer", postRenderPath
  ], { 
    cwd: dir,
    env: { OWNER_REF: JSON.stringify(ctx.object) } 
  });

  const helmOutput = (() => {
    try {
      return JSON.parse(output);
    } catch {
      return {};
    }
  })();

  const notes = helmOutput?.info?.notes ?? "{}";
  try {
    const actualOutputs = JSON.parse(notes);
    if (typeof(actualOutputs) !== "object" || Array.isArray(actualOutputs)) {
      throw new Error("Expecting JSON object");
    }

    return actualOutputs;
  } catch (e: any) {
    console.error(notes);
    console.error("No outputs in NOTES.txt:", e.message);

    return {};
  }
}
