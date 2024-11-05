import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from "fs";
import { RuntimeContext } from "./host.js";
import type { BindingContext } from "./api/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const postRenderPath = resolve(__dirname, "./helm-add-ownership");

export async function applyHelm(dir: string, host: RuntimeContext, ctx: BindingContext, valuesFile: string): Promise<Record<string, any>> {
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

  const values: string[] = [];
  const addValues = (path: string) => {
    if (existsSync(path)) {
      values.push("--values", path);
    }
  };

  // if there's a local values.yaml or values.json file, add it to the args
  addValues(resolve(dir, "values.yaml"));
  addValues(resolve(dir, "values.json"));
  addValues(valuesFile);

  // verify schema
  await host.exec("helm", [
    "lint", 
    ".", 
    ...values
  ], { cwd: dir });

  const args = [
    "upgrade",
    release, ".", 
    "--namespace", namespace,
    "--create-namespace",
    "--install",
    "--reset-values",
    "--output", "json",
    "--post-renderer", postRenderPath,
    ...values
  ];

  // install/upgrade
  const output = await host.exec("helm", args, { 
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
