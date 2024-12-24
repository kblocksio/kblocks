import Redis from "ioredis";
import { getConfiguration } from "./config.js";

const noopHandler = {
  // Object handling
  get: () => () => {},
  set: () => () => {},
  has: () => () => {},
  deleteProperty: () => () => {},
  ownKeys: () => () => {},
  getOwnPropertyDescriptor: () => () => {},
  defineProperty: () => () => {},
  preventExtensions: () => () => {},
  isExtensible: () => () => {},
  getPrototypeOf: () => () => {},
  setPrototypeOf: () => () => {},

  // Function handling
  apply: () => () => {},
  construct: () => () => {},
};

// Usage examples:
const createNoopProxy = () => new Proxy({}, noopHandler as any);


export const getRedisConnection = (): { getClient: () => Redis, quit: () => Promise<void> } => {
  let redisClient: Redis | undefined;
  return {
    getClient: () => {
      if (redisClient) {
        return redisClient;
      }

      const redisEndpoint = getConfiguration().redis();
      if (!redisEndpoint) {
        console.log("redis is not set, using noop proxy");
        return createNoopProxy() as Redis;
      }

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
