import { start } from "./control";
import { getEndpoints, KBlock } from "./api/index.js";
import { type connect } from "./socket";
import fs from "fs";
import path from "path";

async function main() {
  const KBLOCKS_SYSTEM_ID = process.env.KBLOCKS_SYSTEM_ID;
  if (!KBLOCKS_SYSTEM_ID) {
    throw new Error("KBLOCKS_SYSTEM_ID is not set");
  }

  const blocks = await readAllBlocks();
  if (blocks.length === 0) {
    throw new Error("No blocks found");
  }

  const connections: ReturnType<typeof connect>[] = [];
  for (const kblock of blocks) {
    const manifest = kblock.manifest;
    const controlEndpoint = getEndpoints().control;
    const connection = start(controlEndpoint, KBLOCKS_SYSTEM_ID, manifest);
    connections.push(connection);
  }

  // Add shutdown signal handlers
  const shutdownHandler = () => {
    console.log("Received shutdown signal. Closing connections...");
    for (const connection of connections) {
      connection.close();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdownHandler);
  process.on('SIGTERM', shutdownHandler);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function readAllBlocks() {
  const blockDirs = fs.readdirSync("/")
    .filter(dir => dir.startsWith("kblock-"))
    .map(dir => path.join("/", dir));

  const blocks: KBlock[] = [];
  for (const dir of blockDirs) {
    try {
      const blockJson = fs.readFileSync(path.join(dir, "block.json"), "utf8");
      blocks.push(JSON.parse(blockJson));
    } catch (error) {
      console.error(`Error reading block.json from ${dir}:`, error);
    }
  }

  return blocks;
}
