const { join } = require("path");
const { exec, getenv, patchStatus, kblockOutputs, tryGetenv } = require("./util");
const fs = require("fs");

async function applyTerraform(ctx, dir) {
  try {
    const tfjson = join(dir, "main.tf.json");
    const tf = JSON.parse(fs.readFileSync(tfjson, "utf8"));
  
    tf.terraform.backend = {
      s3: {
        bucket: getenv("TF_BACKEND_BUCKET"),
        region: getenv("TF_BACKEND_REGION"),
        key: `${getenv("TF_BACKEND_KEY")}-${ctx.object.metadata.namespace}-${ctx.object.metadata.name}`,
        dynamodb_table: tryGetenv("TF_BACKEND_DYNAMODB"),
      }
    };
  
    fs.writeFileSync(tfjson, JSON.stringify(tf, null, 2));
  
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