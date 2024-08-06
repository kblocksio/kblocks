const { exec, patchStatus, kblockOutputs, tryGetenv } = require("./util");
const fs = require("fs");

async function applyTerraform(ctx, dir) {
  try {
    await exec("tofu", ["init", "-input=false", "-lock=false", "-no-color"], { cwd: dir });
  
    if (ctx.watchEvent === "Deleted") {
      await exec("tofu", ["destroy", "-auto-approve", "-no-color"], { cwd: dir });
      return;
    }
  
    await exec("tofu", ["apply", "-input=false", "-auto-approve", "-no-color"], { cwd: dir });
  
    const outputs = kblockOutputs();
    const results = {};
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

exports.applyTerraform = applyTerraform;