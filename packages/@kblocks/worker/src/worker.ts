import fs from "fs";
import path from "path";
import * as tar from "tar";
import Redis from "ioredis";
import { synth } from "./synth.js";
import { exec, tempdir } from "./util.js";
import { BindingContext } from "./types/index.js";
import { startServer } from "./http.js";
import { cloneRepo, listenForChanges } from "./git.js";
import { createLogger } from "./logging.js";
import { Manifest, KConfig } from "./types/index.js";

const mountdir = "/kblock";
const kblock: KConfig = JSON.parse(fs.readFileSync("/kconfig/kblock.json", "utf8"));
if (!kblock.config) {
  throw new Error("kblock.json must contain a 'config' field");
}

if (!kblock.engine) {
  throw new Error("kblock.json must contain an 'engine' field");
}

async function getSource(kblock: KConfig, logger: ReturnType<typeof createLogger>) {
  const archivedir = await extractArchive(mountdir, logger);

  if (kblock.manifest.source) {
    const sourcedir = await cloneRepo(kblock.manifest.source, logger);
    
    // Copy contents of archivedir to sourcedir
    const files = await fs.promises.readdir(archivedir);
    for (const file of files) {
      const srcPath = path.join(archivedir, file);
      const destPath = path.join(sourcedir, file);
      await fs.promises.cp(srcPath, destPath, { recursive: true });
    }

    return sourcedir;
  }

  return archivedir;
}

async function extractArchive(dir: string, logger: ReturnType<typeof createLogger>) {
  logger.info(`Extracting archive from ${dir}`);
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

async function installDependencies(dir: string, logger: ReturnType<typeof createLogger>) {
  await exec(logger, "npm", ["install", "-g", `@kblocks/cli@${process.env.CLI_VERSION}`], { cwd: dir });
  
  if (fs.existsSync(path.join(dir, "package.json"))) {
    if (fs.existsSync(path.join(dir, "node_modules"))) {
      return;
    }
  
    await exec(logger, "npm", ["install", "--production"], { cwd: dir });
  }

  // make sure @winglibs/k8s is installed if this is a wing/k8s block.
  if (kblock.engine === "wing" || kblock.engine === "wing/k8s") {
    await exec(logger, "npm", ["install", "@winglibs/k8s"], { cwd: dir });
  }

  if (fs.existsSync(path.join(dir, "Chart.yaml"))) {
    if (fs.existsSync(path.join(dir, "__helm"))) {
      return;
    }

    await exec(logger, "helm", ["dependency", "update"], { cwd: dir });
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
  
  // Redis client for Redlock
  const redisClient = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times: number) => {
      console.log(`Retrying Redis connection attempt ${times}`);
      return times * 1000;
    },
    maxRetriesPerRequest: null,
  });

  startServer(); // TODO: do we need this to keep the pod alive?

  const objType = kblock.manifest.definition.kind.toLocaleLowerCase();
  const objUri = `system://${objType}`;
  const logger = createLogger(events, objUri, objType);

  const sourcedir = await getSource(kblock, logger);
  await installDependencies(sourcedir, logger);

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
        await synth(sourcedir, kblock.engine, manifest.definition.plural, event);
      } catch (error) {
        console.error(`Error processing event: ${error}.`);
      } finally {
        await redisClient.xdel(`worker-${workerIndex}`, message[0]);
      }
    }

    setTimeout(listenForMessage, 1000, messages[messages.length - 1][0]);
  }

  const commit = await listenForChanges(kblock, async (commit) => {
    if (!process.env.RELEASE_NAME) {
      throw new Error("RELEASE_NAME is not set");
    }

    console.log(`Changes detected: ${commit}. Rebuilding...`);
    const newdir = await extractArchive(mountdir, logger);

    const outputdir = tempdir();
    await exec(logger, "kblocks", ["build", "--output", outputdir], { cwd: newdir });
    await exec(logger, "helm", ["upgrade", "--install", process.env.RELEASE_NAME, outputdir], { cwd: outputdir });
  });
  console.log("Initial commit", commit);

  listenForMessage();
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});

