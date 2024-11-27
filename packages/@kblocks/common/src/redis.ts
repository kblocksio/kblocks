import Redis from "ioredis";
import { getEndpoints } from "@kblocks/api";

export const getRedisConnection = () => {
  let redisClient: Redis | undefined;
  return {
    getClient: () => {
      console.log("getting client");
      if (redisClient) {
        console.log("client already exists");
        return redisClient;
      }

      console.log("creating client");
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
