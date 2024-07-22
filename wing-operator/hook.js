#!/usr/bin/env node
const fs = require("fs");
const { spawnSync } = require("child_process");

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
    "try {",
    `  new lib.${obj.kind}(unsafeCast(o)) as \"${obj.metadata.name}\";`,
    "} catch e \{",
    "  log(e);",
    "}",
  ];

  fs.writeFileSync("/wing/obj.json", JSON.stringify(obj, null, 2));
  fs.writeFileSync("/wing/main.w", code.join("\n"));

  const command = ctx.watchEvent === "Deleted" ? "delete" : "apply";

  spawnSync("wing", ["compile", "-t", "@winglibs/cdk8s", "main.w"], { cwd: "/wing", stdio: "inherit" });
  spawnSync("kubectl", [command, "-n", "default", "-f", "target/main.cdk8s/*.yaml"], { cwd: "/wing", stdio: "inherit" });

  fs.rmSync("/wing/main.w");
}
