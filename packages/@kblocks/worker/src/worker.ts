import fs from "fs";
import path from "path";
import zlib from "zlib";
import * as tar from "tar";
import Redis from "ioredis";
import { synth } from "./synth.js";
import { exec, tempdir } from "./util.js";
import { startServer } from "./http.js";
import { cloneRepo, listenForChanges } from "./git.js";
import {
  Manifest,
  BindingContext,
  systemApiVersionFromDisplay,
  systemApiVersion,
  formatBlockTypeForEnv
} from "@kblocks/api";
import { closeEvents } from "@kblocks/common";

type Source = {
  kblock: Manifest;
  dir: string;
}

const mountdir = "/kblock";

async function getSource(blocks: Manifest[]) {
  const sources: Record<string, Source> = {};
  for (const kblock of blocks) {
    const blockType = formatBlockTypeForEnv(kblock.definition);
    const archive = `${mountdir}_${blockType}`;
    console.log(`Checking for archive in ${archive}`);

    const archivedir = await extractArchive(archive);
  
    if (archivedir) {
      if (kblock.source) {
        console.log("WARNING: Found block source in archive, skipping git source.");
      }
  
      sources[blockType] = { kblock, dir: archivedir };
    }
  
    if (kblock.source) {
      // we expect the source directory to always end with "/src"
      if (!kblock.source.directory.endsWith("/src")) {
        throw new Error("Source directory must end with '/src'");
      }
  
      const clonedir = await cloneRepo(kblock.source);
      const sourcedir = tempdir();
      await fs.promises.cp(clonedir, sourcedir, { recursive: true, dereference: true });    
      sources[blockType] = { kblock, dir: sourcedir };
    }
  }
  
  if (!Object.keys(sources).length) {
    console.log("NOTE: No block source found.");
    return undefined;
  }

  return sources;
}

async function extractArchive(dir: string) {
  if (!fs.existsSync(path.join(dir, "archive.tgz"))) {
    return;
  }

  console.log(`Extracting archive from ${dir}`);
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

async function installDependencies(sources: Record<string, Source>) {
  for (const source of Object.values(sources)) {
    if (fs.existsSync(path.join(source.dir, "package.json"))) {
      if (fs.existsSync(path.join(source.dir, "node_modules"))) {
        return;
      }
    
      await exec(undefined, "npm", ["install", "--production"], { cwd: source.dir });
    }
  
    // make sure @winglibs/k8s is installed if this is a wing/k8s block.
    if (source.kblock.engine === "wing" || source.kblock.engine === "wing/k8s") {
      await exec(undefined, "npm", ["install", "@winglibs/k8s"], { cwd: source.dir });
    }
  
    if (fs.existsSync(path.join(source.dir, "Chart.yaml"))) {
      if (fs.existsSync(path.join(source.dir, "__helm"))) {
        return;
      }
  
      await exec(undefined, "helm", ["dependency", "update"], { cwd: source.dir });
      fs.writeFileSync(path.join(source.dir, "__helm"), "{}");
    }
  }
}

async function main() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }

  if (!process.env.WORKER_INDEX) {
    throw new Error("WORKER_INDEX is not set");
  }

  const blocks = await readAllBlocks();
  if (blocks.length === 0) {
    throw new Error("No blocks found");
  }
  
  // Redis client for Redlock
  const redisClient = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times: number) => {
      console.log(`Retrying Redis connection attempt ${times}`);
      return times * 1000;
    },
    maxRetriesPerRequest: null,
  });

  // Add signal handlers
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`Received ${signal}. Shutting down gracefully...`);
    await redisClient.quit();
    await closeEvents();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  startServer(); // TODO: do we need this to keep the pod alive?

  const sourcedirs = await getSource(blocks);
  if (!sourcedirs) {
    throw new Error("No block source found. Exiting.");
  }

  await installDependencies(sourcedirs);

  const workerIndex = parseInt(process.env.WORKER_INDEX, 10);

  async function listenForMessage(lastId = "0") {
    if (isShuttingDown) return;
    console.log(`Listening for messages on worker-${workerIndex} with id: `, lastId);
    const results = await redisClient.xread("COUNT", 1, "BLOCK", 0, "STREAMS", `worker-${workerIndex}`, lastId);
    if (!results) {
      setTimeout(listenForMessage, 1000, lastId);
      return;
    }

    const [key, messages] = results[0];
    console.log(`Received ${messages.length} messages from ${key}`);

    for (const message of messages) {
      if (isShuttingDown) break;
      try {
        const event: BindingContext = JSON.parse(message[1][1]);
        const apiVersion = systemApiVersionFromDisplay(event.object.apiVersion);
        const kblock = blocks.find(b => systemApiVersion(b) === apiVersion && b.definition.kind === event.object.kind);
        if (!kblock) {
          throw new Error(`No kblock found for apiVersion ${apiVersion}`);
        }

        const manifest = kblock as Manifest;
        const blockType = formatBlockTypeForEnv(kblock.definition);
        if (!sourcedirs || !sourcedirs[blockType]) {
          throw new Error(`No block source found for ${blockType}`);
        }

        console.log(`Processing event: ${blockType}-${event.object.metadata.namespace}-${event.object.metadata.name}`);
        await synth(sourcedirs[blockType].dir, kblock.engine, manifest.definition.plural, event);
      } catch (error) {
        console.error(`Error processing event: ${error}.`);
      } finally {
        await redisClient.xdel(`worker-${workerIndex}`, message[0]);
      }
    }

    if (!isShuttingDown) {
      setTimeout(listenForMessage, 1000, messages[messages.length - 1][0]);
    }
  }

  for (const kblock of blocks) {
    const commit = await listenForChanges(kblock, async (commit) => {
      console.log(`Changes detected: ${commit}. Rebuilding...`);
      await exec(undefined, "kubectl", [
        "label",
        "blocks.kblocks.io",
        kblock.definition.group ? `${kblock.definition.plural}.${kblock.definition.group}` : kblock.definition.plural,
        `kblocks.io/commit=${commit}`,
        "-n",
        kblock.operator?.namespace ?? "default"
      ]);
    });
    console.log("Initial commit", commit);
  }

  listenForMessage();
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});

async function readAllBlocks() {
  const blockDirs = fs.readdirSync("/")
    .filter(dir => dir.startsWith("kblock-"))
    .map(dir => path.join("/", dir));

  const blocks: Manifest[] = [];
  for (const dir of blockDirs) {
    try {
      const blockJson = fs.readFileSync(path.join(dir, "block.json"), "utf8");
      const decompressed = zlib.inflateSync(Buffer.from(blockJson, "base64"));
      blocks.push(JSON.parse(decompressed.toString("utf8")));
    } catch (error) {
      console.error(`Error reading block.json from ${dir}:`, error);
    }
  }

  return blocks;
}
