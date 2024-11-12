import { start } from "./control";
import { getEndpoints, KConfig } from "./api/index.js";
import { type connect } from "./socket";
import fs from "fs";

async function main() {
  const KBLOCKS_SYSTEM_ID = process.env.KBLOCKS_SYSTEM_ID;
  if (!KBLOCKS_SYSTEM_ID) {
    throw new Error("KBLOCKS_SYSTEM_ID is not set");
  }

  const kconfig: KConfig = JSON.parse(fs.readFileSync("/kconfig/kblock.json", "utf8"));
  if (!kconfig.config) {
    throw new Error("kblock.json must contain a 'config' field");
  }

  const connections: ReturnType<typeof connect>[] = [];
  for (const kblock of kconfig.blocks) {
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
