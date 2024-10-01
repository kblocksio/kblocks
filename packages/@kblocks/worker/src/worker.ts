import fs from "fs";
import path from "path";
import * as tar from "tar";
import Redis from "ioredis";
import { synth } from "./synth.js";
import { exec, tempdir } from "./util.js";
import { BindingContext } from "./types/index.js";
import { startServer } from "./http.js";
import { cloneRepo, listenForChanges } from "./git.js";
import { Manifest, KConfig } from "./types/index.js";

const mountdir = "/kblock";
const kblock: KConfig = JSON.parse(fs.readFileSync("/kconfig/kblock.json", "utf8"));
if (!kblock.config) {
  throw new Error("kblock.json must contain a 'config' field");
}

if (!kblock.engine) {
  throw new Error("kblock.json must contain an 'engine' field");
}

async function getSource(kblock: KConfig) {
  const archivedir = await extractArchive(mountdir);

  if (kblock.manifest.source) {
    const clonedir = await cloneRepo(kblock.manifest.source);
    const sourcedir = tempdir();
    await fs.promises.cp(clonedir, sourcedir, { recursive: true, dereference: true });
    
    if (archivedir) {
      // Copy contents of archivedir to sourcedir
      const files = await fs.promises.readdir(archivedir);
      for (const file of files) {
        const srcPath = path.join(archivedir, file);
        const destPath = path.join(sourcedir, file);
        await fs.promises.cp(srcPath, destPath, { recursive: true, dereference: true });
      }
    }

    return sourcedir;
  }

  if (!archivedir) {
    throw new Error("No archive or sourcefound");
  }

  return archivedir;
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
  
  // Redis client for Redlock
  const redisClient = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times: number) => {
      console.log(`Retrying Redis connection attempt ${times}`);
      return times * 1000;
    },
    maxRetriesPerRequest: null,
  });

  startServer(); // TODO: do we need this to keep the pod alive?

  const sourcedir = await getSource(kblock);
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
    console.log(`Changes detected: ${commit}. Rebuilding...`);
    await exec(undefined, "kubectl", [
      "label",
      "blocks.kblocks.io",
      `${kblock.manifest.definition.plural}.${kblock.manifest.definition.group}`,
      `kblocks.io/commit=${commit}`,
      "-n",
      kblock.manifest.operator?.namespace ?? "default"
    ]);
  });
  console.log("Initial commit", commit);

  listenForMessage();
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});

