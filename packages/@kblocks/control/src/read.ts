import * as k8s from "@kubernetes/client-node";
import Redis from "ioredis";
import { createHash } from "crypto";
import { BindingContext, parseBlockUri } from "./api";
import { Context } from "./context";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not set");
}

if (!process.env.WORKERS) {
  throw new Error("WORKERS is not set");
}

const workers = parseInt(process.env.WORKERS, 10);
const redisClient = new Redis(process.env.REDIS_URL, {
  retryStrategy: (times: number) => {
    console.log(`Retrying Redis connection attempt ${times}`);
    return times * 1000;
  },
  maxRetriesPerRequest: null,
});

export async function readObject(client: k8s.CustomObjectsApi, ctx: Context, objUri: string) {
  console.log(`READ: ${objUri}`);

  const { group, version, plural } = ctx;
  const { namespace, name } = parseBlockUri(objUri);

  const obj = await client.getNamespacedCustomObject(group, version, namespace, plural, name);
  await sendContextToStream(redisClient, workers, {
    object: obj.body as any,
    type: "request",
    watchEvent: "Read",
  });
}

async function sendContextToStream(redisClient: Redis, workers: number, context: BindingContext & { type: string}) {
  try {
    const key = `${context.object.metadata.namespace}/${context.object.metadata.name}`;
    const hash = createHash('sha256').update(key).digest('hex');
    const workerIndex = parseInt(hash, 16) % workers;
    const streamName = `worker-${workerIndex}`;

    console.log("PARTITION:", JSON.stringify({ key, hash, workerIndex, workers, streamName }));   
    await redisClient.xadd(streamName, '*', 'context', JSON.stringify(context));
  } catch (error) {
    console.error('Error sending context to Redis stream:', error);
  }
}
