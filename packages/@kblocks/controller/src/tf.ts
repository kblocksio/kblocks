import type { BindingContext } from "./types";
import { exec, patchStatus, kblockOutputs, tryGetenv } from "./util";
import fs from "fs";

export async function applyTerraform(ctx: BindingContext, dir: string) {
  try {
    await exec("tofu", ["init", "-input=false", "-lock=false", "-no-color"], { cwd: dir });
  
    if (ctx.watchEvent === "Deleted") {
      await exec("tofu", ["destroy", "-auto-approve", "-no-color"], { cwd: dir });
      return;
    }
  
    await exec("tofu", ["apply", "-input=false", "-auto-approve", "-no-color"], { cwd: dir });
  
    const outputs = kblockOutputs();
    const results: Record<string, any> = {};
    for (const name of outputs) {
      const value = await exec("tofu", ["output", "-no-color", name], { cwd: dir });
      try {
        results[name] = JSON.parse(value);
        console.error(`OUTPUT! ${name}=${value}`);
      } catch (e) {
        console.error(`No outputs found.`);
      }
    }
  
    await patchStatus(ctx.object, results);
  } finally {
    // delete the target folder because the 
    // tf backend key is changing between resources
    fs.rmdirSync(dir, { recursive: true });
  }
}
