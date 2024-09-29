import fs from "fs";
import path from "path";
import * as tar from "tar";
import Redis from "ioredis";
import { synth } from "./synth";
import { exec, tempdir } from "./util";
import { BindingContext } from "./types";
import { startServer } from "./http";
import { Manifest } from "./types";

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
  
    await exec(undefined, "npm", ["install", "--production"], { cwd: dir });
  }

  // make sure @winglibs/k8s is installed if this is a wing/k8s block.
  if (kblock.engine === "wing" || kblock.engine === "wing/k8s") {
    await exec(undefined, "npm", ["install", "@winglibs/k8s"], { cwd: dir });
  }

  if (fs.existsSync(path.join(dir, "Chart.yaml"))) {
    if (fs.existsSync(path.join(dir, "__helm"))) {
      return;
    }

    await exec(undefined, "helm", ["dependency", "update"], { cwd: dir });
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

  if (!process.env.WORKER_INDEX) {
    throw new Error("WORKER_INDEX is not set");
  }

  const mountdir = "/kblock";
  
  // Redis client for Redlock
  const redisClient = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times: number) => {
      console.log(`Retrying Redis connection attempt ${times}`);
      return times * 1000;
    },
    maxRetriesPerRequest: null,
  });

  const events = await startServer();

  const sourcedir = await extractArchive(mountdir);
  await installDependencies(sourcedir);

  const workerIndex = parseInt(process.env.WORKER_INDEX, 10);

  async function listenForMessage(lastId = "0") {
    console.log(`Listening for messages on worker-${workerIndex} with id: `, lastId);
    const results = await redisClient.xread("BLOCK", 0, "STREAMS", `worker-${workerIndex}`, lastId);
    if (!results) {
      setTimeout(listenForMessage, 1000, lastId);
      return;
    }

    const [key, messages] = results[0];
    console.log(`Received ${messages.length} messages from ${key}`);
  
    const manifest = kblock.manifest as Manifest;

    for (const message of messages) {
      try {
        const event: BindingContext = JSON.parse(message[1][1]);
        console.log(`Processing event: ${event.object.metadata.namespace}-${event.object.metadata.name}`);
        await synth(sourcedir, kblock.engine, manifest.definition.plural, event, events);
      } catch (error) {
        console.error(`Error processing event: ${error}.`);
      } finally {
        await redisClient.xdel(`worker-${workerIndex}`, message[0]);
      }
    }

    setTimeout(listenForMessage, 1000, messages[messages.length - 1][0]);
  }

  listenForMessage();
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});

