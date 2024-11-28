let logged = false;

export const getEndpoints = () => {
  const KBLOCKS_STORAGE_PREFIX = process.env.KBLOCKS_STORAGE_PREFIX ?? "";
  const KBLOCKS_API_KEY = process.env.KBLOCKS_API_KEY;
  const KBLOCKS_PUBSUB_HOST = process.env.KBLOCKS_PUBSUB_HOST;
  const KBLOCKS_PUBSUB_PORT = process.env.KBLOCKS_PUBSUB_PORT ? parseInt(process.env.KBLOCKS_PUBSUB_PORT) : 18284;
  const KBLOCKS_EVENTS_CHANNEL = process.env.KBLOCKS_EVENTS_CHANNEL ?? `${KBLOCKS_STORAGE_PREFIX}kblocks-events`;
  const KBLOCKS_CONTROL_CHANNEL = process.env.KBLOCKS_CONTROL_CHANNEL ?? `${KBLOCKS_STORAGE_PREFIX}kblocks-control`;

  if (!logged) {
    console.log("endpoints", { KBLOCKS_PUBSUB_HOST, KBLOCKS_PUBSUB_PORT, KBLOCKS_EVENTS_CHANNEL, KBLOCKS_CONTROL_CHANNEL });
    logged = true;
  }

  return {
    redis: () => {
      if (!KBLOCKS_API_KEY) {
        throw new Error("KBLOCKS_API_KEY is not set");
      }

      if (!KBLOCKS_PUBSUB_HOST) {
        throw new Error("KBLOCKS_PUBSUB_HOST is not set");
      }

      return {
        host: KBLOCKS_PUBSUB_HOST,
        port: KBLOCKS_PUBSUB_PORT,
        password: KBLOCKS_API_KEY,
        // username: process.env.KBLOCKS_SYSTEM_ID,
      };
    },
    channels: {
      events: KBLOCKS_EVENTS_CHANNEL,
      control: KBLOCKS_CONTROL_CHANNEL,
    }
  }
};