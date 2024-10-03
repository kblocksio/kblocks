import { synth } from "./build";
import fs from "fs";
import yaml from "yaml";

const valuesFile = process.env.KBLOCKS_VALUES_FILE;
if (!valuesFile) {
  console.error("KBLOCKS_VALUES_FILE is not set");
  process.exit(1);
}

let apiObject;
if (valuesFile.endsWith(".yaml") || valuesFile.endsWith(".yml")) {
  apiObject = yaml.parse(fs.readFileSync(valuesFile, "utf8"));
} else if (valuesFile.endsWith(".json")) {
  apiObject = JSON.parse(fs.readFileSync(valuesFile, "utf8"));
} else {
  console.error("KBLOCKS_VALUES_FILE must be a YAML or JSON file");
  process.exit(1);
}

const manifest = apiObject.spec;

const archiveSource = process.env.KBLOCKS_ARCHIVE_SOURCE;

const output = process.env.KBLOCKS_OUTPUT_DIR;
if (!output) {
  console.error("KBLOCKS_OUTPUT_DIR is not set");
  process.exit(1);
}

synth({ block: manifest, source: archiveSource, output }).then(() => {
  console.log("Block built successfully");
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
