import { build } from "./build";
import fs from "fs";

const valuesFile = process.env.KBLOCKS_VALUES_FILE;
if (!valuesFile) {
  console.error("KBLOCKS_VALUES_FILE is not set");
  process.exit(1);
}

const apiObject = JSON.parse(fs.readFileSync(valuesFile, "utf8"));
const block = apiObject.spec;

const archiveSource = process.env.KBLOCKS_ARCHIVE_SOURCE;

const output = process.env.KBLOCKS_OUTPUT_DIR;
if (!output) {
  console.error("KBLOCKS_OUTPUT_DIR is not set");
  process.exit(1);
}

build({ block, archiveSource, output }).then(() => {
  console.log("Block built successfully");
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
