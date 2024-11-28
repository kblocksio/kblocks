import Redis from "ioredis";
import { getEndpoints } from "./endpoints.js";

export const getRedisConnection = (): { getClient: () => Redis, quit: () => Promise<void> } => {
  let redisClient: Redis | undefined;
  return {
    getClient: () => {
      if (redisClient) {
        return redisClient;
      }

      const redisEndpoint = getEndpoints().redis();
      redisClient = new Redis(redisEndpoint.port, redisEndpoint.host, {
        password: redisEndpoint.password,
        retryStrategy: (times: number) => {
          console.log(`Retrying Redis connection attempt ${times}`);
          return times * 1000;
        },
        maxRetriesPerRequest: null,
      });

      return redisClient;
    },
    quit: async () => {
      if (redisClient) {
        await redisClient.quit();
        redisClient = undefined;
      }
    }
  }
}
