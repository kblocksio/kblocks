#!/usr/bin/env node
const fs = require("fs");
const { spawnSync } = require("child_process");
const crypto = require("crypto");

if (process.argv[2] === "--config") {
  process.stdout.write(fs.readFileSync("config.json", "utf8"));
  process.exit(0);
}

const context = JSON.parse(fs.readFileSync(process.env.BINDING_CONTEXT_PATH, "utf8"));

for (const ctx of context) {
  console.error(JSON.stringify(ctx, null, 2));

  if ("objects" in ctx) {
    for (const ctx2 of ctx.objects) {
      synth(ctx2);
    }
  } else if ("object" in ctx) {
    synth(ctx);
  }
}

function synth(ctx) {
  const obj = ctx.object;

  const code = [
    "bring \".\" as lib;",
    "bring fs;",
    "let o = fs.readJson(\"/wing/obj.json\");",
    `new lib.${obj.kind}(unsafeCast(o.get("spec"))) as \"${obj.metadata.name}\";`,
  ];

  fs.writeFileSync("/wing/obj.json", JSON.stringify(obj ?? {}, null, 2));
  fs.writeFileSync("/wing/main.w", code.join("\n"));

  const command = ctx.watchEvent === "Deleted" ? "delete" : "apply";

  const objidLabel = "wing.cloud/object-id";
  const objid = crypto.createHash('md5').update(`${obj.apiVersion}-${obj.kind}-${obj.metadata.name}`).digest('hex');

  const labels = {
    [objidLabel]: objid,
    "wing.cloud/api-version": obj.apiVersion.replace("/", "-"),
    "wing.cloud/kind": obj.kind,
    "wing.cloud/name": obj.metadata.name,
    ...obj.metadata.labels,
  };

  spawnSync("wing", ["compile", "-t", "@winglibs/cdk8s", "main.w"], { 
    cwd: "/wing", 
    stdio: "inherit", 
    env: { WING_K8S_LABELS: JSON.stringify(labels) } 
  });

  const prune = command === "apply" ? ["--prune", "--selector", `${objidLabel}=${objid}`] : [];
  const namespace = obj.metadata.namespace ?? "default";

  spawnSync("kubectl", [command, ...prune, "-n", namespace, "-f", "target/main.cdk8s/*.yaml"], { cwd: "/wing", stdio: "inherit" });

  fs.rmSync("/wing/main.w");
}
