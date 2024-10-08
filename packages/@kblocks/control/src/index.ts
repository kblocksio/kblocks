import { connect } from "./control";
import { getEndpoints } from "./api";
import fs from "fs";

async function main() {
  const KBLOCKS_SYSTEM_ID = process.env.KBLOCKS_SYSTEM_ID;
  if (!KBLOCKS_SYSTEM_ID) {
    throw new Error("KBLOCKS_SYSTEM_ID is not set");
  }

  const kblock = JSON.parse(fs.readFileSync("/kconfig/kblock.json", "utf8"));
  if (!kblock.config) {
    throw new Error("kblock.json must contain a 'config' field");
  }

  if (!kblock.engine) {
    throw new Error("kblock.json must contain an 'engine' field");
  }

  const manifest = kblock.manifest;
  const controlEndpoint = getEndpoints().control;
  const connection = connect(controlEndpoint, KBLOCKS_SYSTEM_ID, manifest);

  // Add shutdown signal handlers
  const shutdownHandler = () => {
    console.log("Received shutdown signal. Closing connection...");
    connection.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdownHandler);
  process.on('SIGTERM', shutdownHandler);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
