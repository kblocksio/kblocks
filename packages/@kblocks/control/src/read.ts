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


export async function readObject(client: k8s.CustomObjectsApi, ctx: Context, objUri: string) {
  console.log(`READ: ${objUri}`);

  const { group, version, plural } = ctx;
  const { namespace, name } = parseBlockUri(objUri);

  const obj = await client.getNamespacedCustomObject(group, version, namespace, plural, name);
  
  try {
    await sendContextToStream(workers, {
      object: obj.body as any,
      type: "request",
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
    const hash = createHash('sha256').update(key).digest('hex');
    const workerIndex = parseInt(hash, 16) % workers;
    const streamName = `worker-${workerIndex}`;

    console.log("PARTITION:", JSON.stringify({ key, hash, workerIndex, workers, streamName }));   
    await redisClient.xadd(streamName, '*', 'context', JSON.stringify(context));
  } finally {
    redisClient.quit();
  }
}
