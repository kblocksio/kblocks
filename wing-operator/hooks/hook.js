#!/usr/bin/env node
const fs = require("fs");
const { synth } = require("./lib");

async function main() {
  if (process.argv[2] === "--config") {
    process.stdout.write(fs.readFileSync("config.json", "utf8"));
    process.exit(0);
  }

  process.chdir("/wing");

  const context = JSON.parse(fs.readFileSync(process.env.BINDING_CONTEXT_PATH, "utf8"));

  for (const ctx of context) {
    console.error(JSON.stringify(ctx, null, 2));

    if ("objects" in ctx) {
      for (const ctx2 of ctx.objects) {
        await synth(ctx2);
      }
    } else if ("object" in ctx) {
      await synth(ctx);
    }
  }
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});
