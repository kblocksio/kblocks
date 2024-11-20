import fs from "fs";
import Redis from "ioredis";
import { BindingContext } from "./types";
import { createHash } from 'crypto';
import { listAllResources } from "./resources";
import { EventAction, EventReason, EventType, KConfig, LogLevel, blockTypeFromUri, displayApiVersion, emitEvent, formatBlockUri, systemApiVersion, systemApiVersionFromDisplay } from "./api/index.js";

async function main() {
  const kconfig: KConfig = JSON.parse(fs.readFileSync("/kconfig/kblock.json", "utf8"));
  if (!kconfig.blocks.length) {
    throw new Error("kblock.json must contain at least one kblock");
  }

  if (!kconfig.config) {
    throw new Error("kblock.json must contain a 'config' field");
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
    if (ctx.binding === "read") {
      const resources = await listAllResourcesForOperator(kconfig);
      for (const resource of resources) {
        // we don't go through processEvent because we don't want to emit the READ event to the backend
        await sendContextToStream(redisClient, workers, {
          ...ctx,
          object: resource,
          type: "schedule",
          watchEvent: "Read",
        });
      }
    } else if (ctx.binding === "flush") {
      const resources = await listAllResourcesForOperator(kconfig);
      for (const resource of resources) {
        await processEvent({
          ...ctx,
          object: resource,
          type: "schedule",
          watchEvent: "Flush",
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

  async function processEvent(context: BindingContext, 
      redis?: { redisClient: Redis, workers: number }) {
    const object = context.object;
    const apiVersion = systemApiVersionFromDisplay(object.apiVersion);
    const kblock = kconfig.blocks.find(b => systemApiVersion(b.manifest) === apiVersion);
    if (!kblock) {
      throw new Error(`No kblock found for apiVersion ${apiVersion}`);
    }

    if (object.kind !== kblock.manifest.definition.kind) {
      console.warn(`Object ${object.metadata.name} has kind ${object.kind}, but expected ${kblock.manifest.definition.kind}`);
    }

    context.object.apiVersion = apiVersion;
    const plural = kblock.manifest.definition.plural;

    const objUri = formatBlockUri({
      group: kblock.manifest.definition.group,
      version: kblock.manifest.definition.version,
      plural: plural,
      system: KBLOCKS_SYSTEM_ID,
      namespace: object.metadata.namespace ?? "default",
      name: object.metadata.name,
    })

    const objType = blockTypeFromUri(objUri);
    const requestId = generateRandomId();

    const reason = renderReason(context.watchEvent);
    emitEvent({
      type: "OBJECT",
      // if we're not flushing, the worker will delete the object
      object: (kconfig.flushOnly && reason === EventAction.Delete) ? {} : context.object,
      reason,
      objUri,
      objType,
      timestamp: new Date(),
      requestId,
    });
  
    if (redis && !kconfig.flushOnly) {
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

async function listAllResourcesForOperator(kconfig: KConfig) {
  const result = await Promise.all(kconfig.blocks.map(kblock => listAllResources(kblock.manifest)));
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