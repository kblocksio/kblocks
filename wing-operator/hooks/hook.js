#!/usr/bin/env node
const fs = require("fs");
const { synth } = require("./lib");

const wing = JSON.parse(fs.readFileSync("wing.json", "utf8"));
if (!wing.config) {
  throw new Error("wing.json must contain a 'config' field");
}

if (!wing.engine) {
  throw new Error("wing.json must contain an 'engine' field");
}

console.error(JSON.stringify(wing, null, 2));

async function main() {
  if (process.argv[2] === "--config") {
    process.stdout.write(JSON.stringify(wing.config, null, 2));
    process.exit(0);
  }

  process.chdir("/wing");

  const context = JSON.parse(fs.readFileSync(process.env.BINDING_CONTEXT_PATH, "utf8"));

  for (const ctx of context) {
    console.error(JSON.stringify(ctx, null, 2));

    if ("objects" in ctx) {
      for (const ctx2 of ctx.objects) {
        await synth(wing.engine, ctx2);
      }
    } else if ("object" in ctx) {
      await synth(wing.engine, ctx);
    }
  }
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});
