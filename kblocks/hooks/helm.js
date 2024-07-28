const { exec } = require("./util");

async function applyHelm(ctx, values) {
  const obj = ctx.object;

  const namespace = obj.metadata.namespace ?? "default";
  const release = obj.metadata.name;

  if (ctx.watchEvent == "Deleted") {
    await exec("helm", ["uninstall", release, "--namespace", namespace]);
    return;
  }

  await exec("helm", [
    "upgrade", release, ".", 
    "--namespace", namespace,
    "--create-namespace",
    "--install",
    "--reset-values",
     "--values", values
  ]);
}

exports.applyHelm = applyHelm;