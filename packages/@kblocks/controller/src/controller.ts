import fs from "fs";
import Queue from "bull";
import { BindingContext } from "./types";

const kblock = JSON.parse(fs.readFileSync("/kconfig/kblock.json", "utf8"));
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

  if (!process.env.BINDING_CONTEXT_PATH) {
    throw new Error("BINDING_CONTEXT_PATH is not set");
  }

  const context = JSON.parse(fs.readFileSync(process.env.BINDING_CONTEXT_PATH, "utf8"));
  
  const contextQueue = new Queue<BindingContext>("contextQueue", process.env.REDIS_URL || "redis://localhost:6379");

  for (const ctx of context) {
    if ("objects" in ctx) {
      for (const ctx2 of ctx.objects) {
        // copy from parent so we can reason about it.
        ctx2.type = ctx.type;
        ctx2.watchEvent = ctx.watchEvent;
        await sendContextToQueue(contextQueue, ctx2);
      }
    } else if ("object" in ctx) {
      await sendContextToQueue(contextQueue, ctx);
    }
  }
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});

// Function to send context to Redis queue
async function sendContextToQueue(contextQueue: Queue.Queue<any>, context: BindingContext) {
  try {
    await contextQueue.add(context);
    console.log('Context sent to Redis queue successfully');
  } catch (error) {
    console.error('Error sending context to Redis queue:', error);
  }
}
