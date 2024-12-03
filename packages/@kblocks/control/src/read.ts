import * as k8s from "@kubernetes/client-node";
import Redis from "ioredis";
import { createHash } from "crypto";
import { BindingContext, isCoreGroup, parseBlockUri } from "@kblocks/api";
import { Context } from "./context";
import { getCoreResource } from "./client";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not set");
}

if (!process.env.WORKERS) {
  throw new Error("WORKERS is not set");
}

const workers = parseInt(process.env.WORKERS, 10);


export async function readObject(client: k8s.CustomObjectsApi, ctx: Context, objUri: string) {
  console.log(`READ: ${objUri}`);

  const { group, version, plural } = ctx;
  const { namespace, name } = parseBlockUri(objUri);

  let obj;
  if (!isCoreGroup(group)) {
    const res = await client.getNamespacedCustomObject(group, version, namespace, plural, name);
    obj = res.body;
  } else {
    obj = await getCoreResource({
      ...ctx,
      name,
      namespace,
    });
  }

  try {
    await sendContextToStream(workers, {
      object: obj as any,
      type: "request",
      binding: "read",
      watchEvent: "Read",
    });
  } catch (e) {
    console.error("error sending READ request to stream:", e);
  }
}

async function sendContextToStream(workers: number, context: BindingContext & { type: string }) {
  const url = process.env.REDIS_URL!;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }

  const redisClient = new Redis(url);

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
  } finally {
    redisClient.quit();
  }
}
