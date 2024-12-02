import { getConfiguration } from "./config.js";
import { getRedisConnection } from "./redis.js";

const redisConnection = getRedisConnection();
const GROUP_NAME = "control";
const CONSUMER_NAME = "consumer";

async function createStreamGroup(stream: string) {
  const redisClient = redisConnection.getClient();
  try {
    await redisClient.xgroup("CREATE", stream, GROUP_NAME, "0", "MKSTREAM");
  } catch (error) {
    // ignore error if group already exists
    console.log(error);
  }
}

export async function subscribeToStream(stream: string, handler: (message: string) => Promise<void>) {
  const redisClient = redisConnection.getClient();
  await createStreamGroup(stream);
  let isShuttingDown = false;

  async function listenForMessage(lastId = ">") {
    if (isShuttingDown) return;
    console.log(`Listening for messages on ${stream} with id: `, lastId);
    const results: any = await redisClient.xreadgroup("GROUP", GROUP_NAME, CONSUMER_NAME, "COUNT", 1, "BLOCK", 0, "NOACK", "STREAMS", stream, lastId);
    if (!results) {
      setTimeout(listenForMessage, 10, lastId);
      return;
    }

    const [key, messages] = results[0];
    console.log(`Received ${messages.length} messages from ${key}`);

    for (const message of messages) {
      if (isShuttingDown) break;
      try {
        await redisClient.xdel(key, message[0]);
        const event: string = message[1][1];
        await handler(event);
      } catch (error) {
        console.error(`Error processing event: ${error}.`);
      }
    }

    if (!isShuttingDown) {
      setTimeout(listenForMessage, 10, lastId);
    }
  }

  listenForMessage();
  return async () => {
    isShuttingDown = true;
    await redisClient.quit();
  }
}

export async function subscribeToControlStream(channel: string, handler: (message: string) => Promise<void>) {
  const stream = `${getConfiguration().channels.control}:${channel}`;
  return subscribeToStream(stream, handler);
}
