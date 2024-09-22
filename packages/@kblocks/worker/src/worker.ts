import fs from "fs";
import path from "path";
import * as tar from "tar";
import Queue from "bull";
import Redlock, { Lock } from "redlock";
import Redis from "ioredis";
import { synth } from "./synth";
import { RuntimeHost } from "./host";
import { exec, getenv, tempdir, tryGetenv } from "./util";
import { newSlackThread } from "./slack";
import { chatCompletion } from "./ai";
import { BindingContext } from "./types";

const kblock = JSON.parse(fs.readFileSync("/kconfig/kblock.json", "utf8"));
if (!kblock.config) {
  throw new Error("kblock.json must contain a 'config' field");
}

if (!kblock.engine) {
  throw new Error("kblock.json must contain an 'engine' field");
}

async function extractArchive(dir: string) {
  const encodedTgz = fs.readFileSync(path.join(dir, "archive.tgz"), "utf8");
  const decodedTgz = Buffer.from(encodedTgz, "base64");
  const targetDir = tempdir();
  const tempFile = path.join(targetDir, "archive.tgz");
  
  fs.writeFileSync(tempFile, decodedTgz);

  await tar.x({
    cwd: targetDir,
    file: tempFile,
  });

  fs.unlinkSync(tempFile);

  return targetDir;
}

async function installDependencies(dir: string) {
  if (fs.existsSync(path.join(dir, "package.json"))) {
    if (fs.existsSync(path.join(dir, "node_modules"))) {
      return;
    }
  
    await exec("npm", ["install", "--production"], { cwd: dir });
  }

  if (fs.existsSync(path.join(dir, "Chart.yaml"))) {
    if (fs.existsSync(path.join(dir, "__helm"))) {
      return;
    }

    await exec("helm", ["dependency", "update"], { cwd: dir });
    fs.writeFileSync(path.join(dir, "__helm"), "{}");
  }
}

async function main() {
  if (process.argv[2] === "--config") {
    process.stdout.write(JSON.stringify(kblock.config, null, 2));
    return process.exit(0);
  }

  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }

  const mountdir = "/kblock";
  
  // Redis client for Redlock
  const redisClient = new Redis(process.env.REDIS_URL);

  // Redlock instance
  const redlock = new Redlock(
    [redisClient],
    {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
    }
  );
  const contextQueue = new Queue("contextQueue", process.env.REDIS_URL);

  const sourcedir = await extractArchive(mountdir);
  await installDependencies(sourcedir);

  const host: RuntimeHost = {
    getenv,
    tryGetenv,
    exec,
    newSlackThread,
    chatCompletion,
  };

  contextQueue.process(async (job) => {
    const event: BindingContext = job.data;
    const lockKey = `lock:${event.object.metadata.namespace}-${event.object.metadata.name}`;
  
    let lock: Lock | undefined = undefined;
    try {
      lock = await redlock.acquire([lockKey], 30000);
    } catch (error) {
      console.log(`Lock for ${lockKey} is held, re-queuing event`);
      await job.retry();
      console.log(`Job ${job.id} requeued for ${lockKey}`);
      return;
    }

    try {
      const extendLock = async () => {
        try {
          console.log(`Extending lock for ${lockKey}`);
          if (lock) {
            lock = await lock.extend(10000);
            setTimeout(extendLock, 5000);
          }
        } catch (error) {
          console.error('Error extending lock:', error);
        }
      };

      setTimeout(extendLock, 5000);

      console.log(`Processing event for ${lockKey}`);
      await synth(sourcedir, host, kblock.engine, event);
      console.log(`Finished processing event for ${lockKey}`);
    } catch (error) {
      console.error(`Error processing event for ${lockKey}: ${error}`);
    } finally {
      if (lock) {
        try {
          await lock.release();
          lock = undefined;
        } catch (error) {
          console.error('Error releasing lock:', error);
        }
      }
    }
  });
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});

