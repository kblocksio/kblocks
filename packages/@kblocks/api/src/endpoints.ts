export const getEndpoints = () => {
  const PORTAL_REDIS_PREFIX = process.env.PORTAL_REDIS_PREFIX ?? "";
  const PORTAL_REDIS_PASSWORD = process.env.PORTAL_REDIS_PASSWORD;

  return {
    redis: () => {
      if (!PORTAL_REDIS_PASSWORD) {
        throw new Error("PORTAL_REDIS_PASSWORD is not set");
      }

      return {
        host: process.env.PORTAL_REDIS_URL ?? "redis-18284.c281.us-east-1-2.ec2.redns.redis-cloud.com",
        port: process.env.PORTAL_REDIS_PORT ? parseInt(process.env.PORTAL_REDIS_PORT) : 18284,
        password: PORTAL_REDIS_PASSWORD,
        // username: process.env.KBLOCKS_SYSTEM_ID,
      };
    },
    channels: {
      events: process.env.PORTAL_REDIS_EVENTS_CHANNEL ?? `${PORTAL_REDIS_PREFIX}kblocks-events`,
      control: process.env.PORTAL_REDIS_CONTROL_CHANNEL ?? `${PORTAL_REDIS_PREFIX}kblocks-control`,
    }
  }
};