import type { WorkerEvent } from "@kblocks/api";
import { getConfiguration } from "./config.js";
import { getRedisConnection } from "./redis.js";

const redisConnection = getRedisConnection();

export function emitEvent(event: WorkerEvent) {
  emitEventAsync(event).catch(err => {
    console.error(err);
  });
}

export async function emitEventAsync(event: WorkerEvent) {
  const redisClient = redisConnection.getClient();
  return redisClient.xadd(getConfiguration().channels.events, '*', 'message', JSON.stringify(event));
}

export async function closeEvents() {
  await redisConnection.quit();
  console.log("closed events");
}
