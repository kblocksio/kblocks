import type { BindingContext } from "./types";

const { exec, patchStatus } = require("./util");
const postRenderPath = require.resolve("./helm-add-ownership");

export async function applyHelm(ctx: BindingContext, values: string) {
  const obj = ctx.object;

  const namespace = obj.metadata.namespace ?? "default";
  const release = obj.metadata.name;

  if (ctx.watchEvent == "Deleted") {
    await exec("helm", [
      "uninstall", release, 
      "--namespace", namespace
    ]);

    return;
  }

  // verify schema
  await exec("helm", [
    "lint", 
    ".", 
    "--values", values
  ]);

  // // print the template for debugging
  // await exec("helm", [
  //   "template",
  //   release, ".",
  //     "--values", values
  // ]);

  // install/upgrade
  const output = await exec("helm", [
    "upgrade",
    release, ".", 
    "--namespace", namespace,
    "--create-namespace",
    "--install",
    "--wait",
    "--reset-values",
    "--values", values,
    "--output", "json",
    "--post-renderer", postRenderPath
  ], { 
    env: { OWNER_REF: JSON.stringify(ctx.object) } 
  });

  const helmOutput = JSON.parse(output);
  const notes = helmOutput?.info?.notes ?? "{}";
  try {
    const actualOutputs = JSON.parse(notes);
    if (typeof(actualOutputs) !== "object" || Array.isArray(actualOutputs)) {
      throw new Error("Expecting JSON object");
    }

    if (Object.keys(actualOutputs).length > 0) {
      await patchStatus(ctx.object, actualOutputs);
    }
  } catch (e: any) {
    console.error(notes);
    console.error("No outputs in NOTES.txt:", e.message);
  }
}

exports.applyHelm = applyHelm;