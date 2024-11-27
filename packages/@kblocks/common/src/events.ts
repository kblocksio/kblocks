import { getEndpoints, WorkerEvent } from "@kblocks/api";
import { getRedisConnection } from "./redis";

const MAX_TRIES = 3;
const INITIAL_DELAY = 250;
const EXPONENTIAL_BACKOFF = 1.5;

const redisConnection = getRedisConnection();

export function emitEvent(event: WorkerEvent) {
  emitEventAsync(event).catch(err => {
    console.error(err);
  });
}

export async function emitEventAsync(event: WorkerEvent) {
  const sleep = async (ms: number) => {
    return new Promise(ok => setTimeout(ok, ms));
  };

  let tries = MAX_TRIES;
  let delay = INITIAL_DELAY;

  while (true) {
    try {
      const redisClient = redisConnection.getClient();
      await redisClient.publish(getEndpoints().channels.events, JSON.stringify(event));
      console.log("emitted event");
      return;
    } catch (err: any) {
      if (tries === 0) {
        console.error(`Failed to emit event to ${getEndpoints().channels.events} after ${MAX_TRIES} tries: ${err.cause?.message ?? err.message}`);
        break;
      }

      await sleep(delay);
      delay = Math.floor(delay * EXPONENTIAL_BACKOFF);
      tries--;
    }
  }
}

export async function closeEvents() {
  console.log("closing events");
  await redisConnection.quit();
  console.log("closed events");
}
