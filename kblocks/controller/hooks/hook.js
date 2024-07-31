#!/usr/bin/env node
const fs = require("fs");
const { synth } = require("./synth");

const kblock = JSON.parse(fs.readFileSync("kblock.json", "utf8"));
if (!kblock.config) {
  throw new Error("kblock.json must contain a 'config' field");
}

if (!kblock.engine) {
  throw new Error("kblock.json must contain an 'engine' field");
}

async function main() {
  if (process.argv[2] === "--config") {
    process.stdout.write(JSON.stringify(kblock.config, null, 2));
    return process.exit(0);
  }

  process.chdir("/kblock");

  const context = JSON.parse(fs.readFileSync(process.env.BINDING_CONTEXT_PATH, "utf8"));

  for (const ctx of context) {
    if ("objects" in ctx) {
      for (const ctx2 of ctx.objects) {
        // copy from parent so we can reason about it.
        ctx2.type = ctx.type;
        ctx2.watchEvent = ctx.watchEvent;
        await synth(kblock.engine, ctx2);
      }
    } else if ("object" in ctx) {
      await synth(kblock.engine, ctx);
    }
  }
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});
