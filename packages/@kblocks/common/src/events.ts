import type { WorkerEvent } from "@kblocks/api";
import { getEndpoints } from "./endpoints.js";
import { getRedisConnection } from "./redis.js";

const redisConnection = getRedisConnection();

export function emitEvent(event: WorkerEvent) {
  emitEventAsync(event).catch(err => {
    console.error(err);
  });
}

export async function emitEventAsync(event: WorkerEvent) {
  const redisClient = redisConnection.getClient();
  return redisClient.xadd(getEndpoints().channels.events, '*', 'message', JSON.stringify(event));
}

export async function closeEvents() {
  await redisConnection.quit();
  console.log("closed events");
}
