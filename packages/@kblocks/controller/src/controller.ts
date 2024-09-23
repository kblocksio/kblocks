import fs from "fs";
import Redis from "ioredis";
import { BindingContext } from "./types";
import { createHash } from 'crypto';

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

  if (!process.env.WORKERS) {
    throw new Error("WORKERS is not set");
  }

  const workers = parseInt(process.env.WORKERS, 10);

  const context = JSON.parse(fs.readFileSync(process.env.BINDING_CONTEXT_PATH, "utf8"));
  const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

  for (const ctx of context) {
    if ("objects" in ctx) {
      for (const ctx2 of ctx.objects) {
        // copy from parent so we can reason about it.
        ctx2.type = ctx.type;
        ctx2.watchEvent = ctx.watchEvent;
        await sendContextToStream(redisClient, workers, ctx2);
      }
    } else if ("object" in ctx) {
      await sendContextToStream(redisClient, workers, ctx);
    }
  }
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});

async function sendContextToStream(redisClient: Redis, workers: number, context: BindingContext) {
  try {
    const hash = createHash('md5')
      .update(`${context.object.metadata.namespace}/${context.object.metadata.name}`)
      .digest('hex');
    const workerIndex = parseInt(hash, 16) % workers;
    const streamName = `worker-${workerIndex}`;

    await redisClient.xadd(streamName, '*', 'context', JSON.stringify(context));
    console.log(`Context sent to Redis stream ${streamName} successfully`);
  } catch (error) {
    console.error('Error sending context to Redis stream:', error);
  }
}
