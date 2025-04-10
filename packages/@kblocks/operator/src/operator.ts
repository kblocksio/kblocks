import fs from "fs";
import zlib from "zlib";
import Redis from "ioredis";
import { BindingContext } from "@kblocks/api";
import { createHash } from 'crypto';
import { listAllResources } from "./resources";
import { EventAction, KConfig, Manifest, blockTypeFromUri, formatBlockUri, systemApiVersion, systemApiVersionFromDisplay } from "@kblocks/api";
import { emitEventAsync, closeEvents } from "@kblocks/common";
import path from "path";

async function main() {
  const kconfig: KConfig = JSON.parse(fs.readFileSync("/kconfig/config.json", "utf8"));
  if (!kconfig.config) {
    throw new Error("kblock.json must contain a 'config' field");
  }

  const blocks = await readAllBlocks();
  if (blocks.length === 0) {
    throw new Error("No blocks found");
  }

  const KBLOCKS_SYSTEM_ID = process.env.KBLOCKS_SYSTEM_ID!;
  if (!KBLOCKS_SYSTEM_ID) {
    throw new Error("KBLOCKS_SYSTEM_ID is not set");
  }

  if (process.argv[2] === "--config") {
    process.stdout.write(JSON.stringify(kconfig.config, null, 2));
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
  const redisClient = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    retryStrategy: (times: number) => {
      console.log(`Retrying Redis connection attempt ${times}`);
      return times * 1000;
    },
    maxRetriesPerRequest: null,
  });

  console.log("EVENT:", JSON.stringify(context));
  for (const ctx of context) {
    if (ctx.binding === "read" || ctx.binding === "reconcile") {
      const resources = await listAllNonFlushOnlyResourcesForOperator(blocks);
      for (const resource of resources) {
        // we don't go through processEvent because we don't want to emit the event to the backend
        await sendContextToStream(redisClient, workers, {
          ...ctx,
          object: resource,
          type: "schedule",
          binding: ctx.binding,
          watchEvent: ctx.binding === "read" ? "Read" : "Sync",
        });
      }
    } else if (ctx.binding === "flush") {
      const resources = await listAllFlushOnlyResourcesForOperator(blocks);
      for (const resource of resources) {
        await processEvent({
          ...ctx,
          object: resource,
          type: "schedule",
          watchEvent: "Sync",
        });
      }
    } else {
      if ("objects" in ctx) {
        for (const ctx2 of ctx.objects) {
          // copy from parent so we can reason about it.
          ctx2.type = ctx.type;
          ctx2.watchEvent = ctx.watchEvent;
          await processEvent(ctx2, { redisClient, workers });
        }
      } else if ("object" in ctx) {
        await processEvent(ctx, { redisClient, workers });
      }
    }
  }

  redisClient.quit();
  await closeEvents();

  async function processEvent(context: BindingContext, 
      redis?: { redisClient: Redis, workers: number }) {
    const object = context.object;
    const apiVersion = systemApiVersionFromDisplay(object.apiVersion);
    const kblock = blocks.find(b => systemApiVersion(b) === apiVersion && b.definition.kind === object.kind);
    if (!kblock) {
      throw new Error(`No kblock found for apiVersion ${apiVersion}`);
    }

    if (object.kind !== kblock.definition.kind) {
      console.warn(`Object ${object.metadata.name} has kind ${object.kind}, but expected ${kblock.definition.kind}`);
    }

    context.object.apiVersion = apiVersion;
    const plural = kblock.definition.plural;

    const objUri = formatBlockUri({
      group: kblock.definition.group,
      version: kblock.definition.version,
      plural: plural,
      system: KBLOCKS_SYSTEM_ID,
      namespace: object.metadata.namespace ?? "default",
      name: object.metadata.name,
    })

    const objType = blockTypeFromUri(objUri);
    const requestId = generateRandomId();

    const reason = renderReason(context.watchEvent);
    await emitEventAsync({
      type: "OBJECT",
      // if we're not flushing, the worker will delete the object
      object: (kblock.operator?.flushOnly && reason === EventAction.Delete) ? {} : context.object,
      reason,
      objUri,
      objType,
      timestamp: new Date(),
      requestId,
    });
  
    if (redis && !kblock.operator?.flushOnly) {
      await sendContextToStream(redis.redisClient, redis.workers, {
        ...context,
        requestId,
      });
    }
  }  
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});

async function listAllFlushOnlyResourcesForOperator(blocks: Manifest[]) {
  const result = await Promise.all(
    blocks.filter(b => b.operator?.flushOnly)
      .map(kblock => listAllResources(kblock))
  );
  return result.flat();
}

async function listAllNonFlushOnlyResourcesForOperator(blocks: Manifest[]) {
  const result = await Promise.all(
    blocks.filter(b => !b.operator?.flushOnly)
      .map(kblock => listAllResources(kblock))
  );
  return result.flat();
}

function renderReason(watchEvent: BindingContext["watchEvent"]): EventAction {
  switch (watchEvent) {
    case "Added": return EventAction.Create;
    case "Modified": return EventAction.Update;
    case "Deleted": return EventAction.Delete;
    case "Read": return EventAction.Read;
    default: return EventAction.Sync;
  }
}

async function sendContextToStream(redisClient: Redis, workers: number, context: BindingContext) {
  try {
    const key = `${context.object.metadata.namespace}/${context.object.metadata.name}`;
    // Use murmur3 hash for better distribution properties and performance
    const hash = createHash('shake128', { outputLength: 4 }) // 32-bit output
      .update(key)
      .digest('hex');
    const workerIndex = parseInt(hash, 16) % workers;
    const streamName = `worker-${workerIndex}`;

    console.log("PARTITION:", JSON.stringify({ key, hash, workerIndex, workers, streamName }));   
    await redisClient.xadd(streamName, '*', 'context', JSON.stringify(context));
  } catch (error) {
    console.error('Error sending context to Redis stream:', error);
  }
}

export function generateRandomId() {
  return crypto.randomUUID();
}

async function readAllBlocks() {
  const blockDirs = fs.readdirSync("/")
    .filter(dir => dir.startsWith("kblock-"))
    .map(dir => path.join("/", dir));

  const blocks: Manifest[] = [];
  for (const dir of blockDirs) {
    try {
      const blockJson = fs.readFileSync(path.join(dir, "block.json"), "utf8");
      const decompressed = zlib.inflateSync(Buffer.from(blockJson, "base64"));
      blocks.push(JSON.parse(decompressed.toString("utf8")));
    } catch (error) {
      console.error(`Error reading block.json from ${dir}:`, error);
    }
  }

  return blocks;
}
