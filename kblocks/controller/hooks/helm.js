const { exec, patchStatus } = require("./util");

async function applyHelm(ctx, values) {
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

  // print the template for debugging
  await exec("helm", [
    "template",
    release, ".",
      "--values", values
  ]);
  
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
    "--output", "json" 
  ]);

  const helmOutput = JSON.parse(output);
  const notes = helmOutput?.info?.notes ?? "{}";
  console.error({ notes });
  try {
    const actualOutputs = JSON.parse(notes);
    console.log("outputs:", actualOutputs);
    await patchStatus(ctx.object, actualOutputs);
  } catch (e) {
    console.error("Helm notes are not valid JSON:", e); 
  }
}

exports.applyHelm = applyHelm;