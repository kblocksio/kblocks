export const getEndpoints = () => {
  const KBLOCKS_STORAGE_PREFIX = process.env.KBLOCKS_STORAGE_PREFIX ?? "";
  const KBLOCKS_API_KEY = process.env.KBLOCKS_API_KEY;

  return {
    redis: () => {
      if (!KBLOCKS_API_KEY) {
        throw new Error("KBLOCKS_API_KEY is not set");
      }

      return {
        host: process.env.KBLOCKS_HOST ?? "redis.staging.kblocks.io",
        port: process.env.KBLOCKS_PORT ? parseInt(process.env.KBLOCKS_PORT) : 18284,
        password: KBLOCKS_API_KEY,
        // username: process.env.KBLOCKS_SYSTEM_ID,
      };
    },
    channels: {
      events: process.env.KBLOCKS_EVENTS_CHANNEL ?? `${KBLOCKS_STORAGE_PREFIX}kblocks-events`,
      control: process.env.KBLOCKS_CONTROL_CHANNEL ?? `${KBLOCKS_STORAGE_PREFIX}kblocks-control`,
    }
  }
};