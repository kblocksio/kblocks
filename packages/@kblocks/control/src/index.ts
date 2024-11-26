import { start } from "./control";
import { getEndpoints, Manifest } from "./api/index.js";
import { type connect } from "./socket";
import fs from "fs";
import path from "path";
import zlib from "zlib";

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
  for (const manifest of blocks) {
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
