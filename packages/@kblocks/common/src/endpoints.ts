export const getEndpoints = () => {
  const KBLOCKS_STORAGE_PREFIX = process.env.KBLOCKS_STORAGE_PREFIX ?? "";
  const KBLOCKS_API_KEY = process.env.KBLOCKS_API_KEY;
  const host = process.env.KBLOCKS_HOST ?? "redis.staging.kblocks.io";
  const port = process.env.KBLOCKS_PORT ? parseInt(process.env.KBLOCKS_PORT) : 18284;
  const events = process.env.KBLOCKS_EVENTS_CHANNEL ?? `${KBLOCKS_STORAGE_PREFIX}kblocks-events`;
  const control = process.env.KBLOCKS_CONTROL_CHANNEL ?? `${KBLOCKS_STORAGE_PREFIX}kblocks-control`;
  console.log("endpoints", { host, port, events, control });

  return {
    redis: () => {
      if (!KBLOCKS_API_KEY) {
        throw new Error("KBLOCKS_API_KEY is not set");
      }

      return {
        host,
        port,
        password: KBLOCKS_API_KEY,
        // username: process.env.KBLOCKS_SYSTEM_ID,
      };
    },
    channels: {
      events,
      control,
    }
  }
};