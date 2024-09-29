import { connect } from "./control";
import fs from "fs";

async function main() {
  const KBLOCKS_SYSTEM_ID = process.env.KBLOCKS_SYSTEM_ID;
  if (!KBLOCKS_SYSTEM_ID) {
    throw new Error("KBLOCKS_SYSTEM_ID is not set");
  }

  const KBLOCKS_CONTROL_URL = process.env.KBLOCKS_CONTROL_URL;
  if (!KBLOCKS_CONTROL_URL) {
    console.warn("KBLOCKS_CONTROL_URL is not set, control will not be available");
    process.exit(0);
  }

  const kblock = JSON.parse(fs.readFileSync("/kconfig/kblock.json", "utf8"));
  if (!kblock.config) {
    throw new Error("kblock.json must contain a 'config' field");
  }

  if (!kblock.engine) {
    throw new Error("kblock.json must contain an 'engine' field");
  }

  const manifest = kblock.manifest;
  connect(KBLOCKS_CONTROL_URL, KBLOCKS_SYSTEM_ID, manifest);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
