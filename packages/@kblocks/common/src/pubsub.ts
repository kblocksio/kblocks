import { getEndpoints } from "./endpoints.js";
import { getRedisConnection } from "./redis.js";

const redisConnection = getRedisConnection();

export function subscribeToControlUpdates(channel: string, handler: (message: string) => void) {
  const controlChannel = `${getEndpoints().channels.control}:${channel}`;
  const redisClient = redisConnection.getClient();
  redisClient.subscribe(controlChannel);
  redisClient.on("message", (channel, message) => {
    handler(message as string);
  });
  return async () => {
    await redisClient.unsubscribe(controlChannel);
    redisClient.off("message", handler);
    await redisClient.quit();
  }
}
