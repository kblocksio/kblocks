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

function setValidation(namespace, obj, validation) {
  spawnSync("kubectl", [
    "patch",
    "-n",
    namespace,
    obj.kind,
    obj.metadata.name,
    "--type",
    "merge",
    "--subresource",
    "status",
    "--patch",
    `status: {validation: ${validation}}`,
  ], { cwd: "/wing", stdio: "inherit" });
}

function synth(ctx) {
  const obj = ctx.object;

  const code = [
    "bring \".\" as lib;",
    "bring fs;",
    "let o = fs.readJson(\"/wing/obj.json\");",
    "try {",
    `  new lib.${obj.kind}(unsafeCast(o)) as \"${obj.metadata.name}\";`,
    "} catch e {",
    "  fs.writeFile(\"/wing/validation.txt\", e);",
    "  throw e;",
    "}",
  ];

  fs.writeFileSync("/wing/obj.json", JSON.stringify(obj ?? {}, null, 2));
  fs.writeFileSync("/wing/main.w", code.join("\n"));

  const command = ctx.watchEvent === "Deleted" ? "delete" : "apply";

  const objidLabel = "wing.cloud/object-id";
  const objid = crypto.createHash('md5').update(`${obj.apiVersion}-${obj.kind}-${obj.metadata.name}`).digest('hex');
  const namespace = obj.metadata.namespace ?? "default";

  const labels = {
    [objidLabel]: objid,
    "wing.cloud/api-version": obj.apiVersion.replace("/", "-"),
    "wing.cloud/kind": obj.kind,
    "wing.cloud/name": obj.metadata.name,
    ...obj.metadata.labels,
  };

  const proc = spawnSync("wing", ["compile", "-t", "@winglibs/k8s", "main.w"], { 
    cwd: "/wing", 
    stdio: "inherit", 
    env: { WING_K8S_LABELS: JSON.stringify(labels) } 
  });

  if (proc.status !== 0) {
    if (fs.existsSync("/wing/validation.txt")) {
      const validation = fs.readFileSync("/wing/validation.txt", "utf8");
      console.log("validation error", validation);
      setValidation(namespace, obj, validation);
    }

    return;
  }

  const prune = command === "apply" ? ["--prune", "--selector", `${objidLabel}=${objid}`] : [];
  spawnSync("kubectl", [command, ...prune, "-n", namespace, "-f", "target/main.k8s/*.yaml"], { cwd: "/wing", stdio: "inherit" });
  setValidation(namespace, obj, "OK");

  fs.rmSync("/wing/main.w");
}
