let logged = false;

export enum Access {
  Read = "read_only",
  Write = "read_write",
}

function stringToEnum<T extends { [key: string]: string }>(enumObj: T, str?: string): T[keyof T] | undefined {
  if (!str) {
    return undefined;
  }

  const enumValues = Object.values(enumObj);
  const index = enumValues.indexOf(str);
  return index >= 0 ? enumValues[index] as T[keyof T] : undefined;
}

export const getConfiguration = () => {
  const KBLOCKS_PORTAL_SYSTEM = process.env.KBLOCKS_PORTAL_SYSTEM;
  const KBLOCKS_STORAGE_PREFIX = process.env.KBLOCKS_STORAGE_PREFIX ?? "";
  const KBLOCKS_PUBSUB_KEY = process.env.KBLOCKS_PUBSUB_KEY;
  const KBLOCKS_PUBSUB_HOST = process.env.KBLOCKS_PUBSUB_HOST;
  const KBLOCKS_PUBSUB_PORT = process.env.KBLOCKS_PUBSUB_PORT ? parseInt(process.env.KBLOCKS_PUBSUB_PORT) : 18284;
  const KBLOCKS_EVENTS_CHANNEL = process.env.KBLOCKS_EVENTS_CHANNEL ?? `${KBLOCKS_STORAGE_PREFIX}kblocks-events`;
  const KBLOCKS_CONTROL_CHANNEL = process.env.KBLOCKS_CONTROL_CHANNEL ?? `${KBLOCKS_STORAGE_PREFIX}kblocks-control`;
  const KBLOCKS_ACCESS = stringToEnum(Access, process.env.KBLOCKS_ACCESS) ?? Access.Read;

  if (!logged) {
    console.log("configuration", { KBLOCKS_PUBSUB_HOST, KBLOCKS_PUBSUB_PORT, KBLOCKS_EVENTS_CHANNEL, KBLOCKS_CONTROL_CHANNEL, KBLOCKS_ACCESS });
    logged = true;
  }

  return {
    redis: () => {
      if (!KBLOCKS_PUBSUB_KEY) {
        return;
      }

      if (!KBLOCKS_PUBSUB_HOST) {
        return;
      }

      return {
        host: KBLOCKS_PUBSUB_HOST,
        port: KBLOCKS_PUBSUB_PORT,
        password: KBLOCKS_PUBSUB_KEY,
        // username: process.env.KBLOCKS_SYSTEM_ID,
      };
    },
    channels: {
      events: KBLOCKS_EVENTS_CHANNEL,
      control: KBLOCKS_CONTROL_CHANNEL,
    },
    control: {
      access: KBLOCKS_ACCESS,
      portalSystem: KBLOCKS_PORTAL_SYSTEM,
    }
  }
};