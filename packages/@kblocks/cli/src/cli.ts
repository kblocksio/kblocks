import yargs from "yargs";
import { synth } from "./build";
import fs from "fs";
import yaml from "yaml";
import { Manifest } from "./api";
import path from "path";
import { enrich } from "./enrich";
import { readManifest, writeManifest, resolveExternalAssets } from "./manifest-util";
export async function cli() {
  return yargs
    .help()

    .command("build", "Builds a Helm chart for a block from source", yargs => yargs
      .option("output", {
        alias: "o",
        description: "Where to write the output Helm chart",
        type: "string",
        required: false,
        default: "./dist",
      })
      .option("manifest", {
        alias: "m",
        description: "Block manifest",
        type: "string",
        required: false,
        default: "kblock.yaml",
      })
      .option("source", {
        alias: "s",
        description: "Directory containing the manifest (kblock.yaml) and source code is expected to be under 'src'.",
        type: "string",
        required: false,
        default: ".",
      }), argv => buildCommand(argv))

    .command("enrich", "Enrich the kblock manifest with docs, description, icon and other good stuff (using AI)", 
      yargs => yargs
      .option("manifest", {
        alias: "m",
        description: "Block manifest",
        type: "string",
        required: false,
        default: "kblock.yaml",
      }), argv => enrichCommand(argv))

    .showHelpOnFail(false)
    .fail((message, err) => {
      if (message) {
        console.error(message);
      }

      if (err) {
        console.error(err.stack);
      }
      
      process.exit(1);
    })
    .argv;
}

const enrichCommand = async (opts: { manifest: string }) => {
  const manifestPath = path.resolve(opts.manifest);

  // read the manifest file and extract the block manifest
  var { blockObject, additionalObjects } = readManifest(manifestPath);
  if (!blockObject) {
    throw new Error(`Unable to find a kblocks.io/v1 Block object in ${manifestPath}`);
  }

  const output = await enrich(path.dirname(manifestPath), blockObject.spec);
  blockObject.spec = output;
  writeManifest(manifestPath, blockObject, additionalObjects);
};

export const buildCommand = async (opts: {
  manifest: string;
  source: string;
  output: string;
}) => {
  const manifest = opts.manifest;
  const source = opts.source;
  const output = opts.output;

  // read the manifest file and extract the block manifest
  var { blockObject, additionalObjects } = readManifest(manifest);
  if (!blockObject) {
    throw new Error(`Unable to find a kblocks.io/v1 Block object in ${manifest}`);
  }

  const block: Manifest = await resolveExternalAssets(blockObject.spec);
  console.log("Block:", block);

  // create the output directory
  fs.mkdirSync(output, { recursive: true });

  // Check if Chart.yaml exists in the manifest directory
  const manifestDir = path.dirname(manifest);
  const chartPath = path.join(manifestDir, 'Chart.yaml');
  if (fs.existsSync(chartPath)) {
    fs.copyFileSync(chartPath, path.join(output, 'Chart.yaml'));
  }

  synth({ block, source, output });

  // write any additional objects to the templates directory
  if (additionalObjects.length > 0) {
    const additionalObjectsManifest = path.join(output, "templates", "additional-objects.yaml");
    fs.writeFileSync(additionalObjectsManifest, yaml.stringify(additionalObjects));
  }

  console.log();
  console.log("-------------------------------------------------------------------------------------------------------------------");
  console.log(`Block '${block.definition.group}/${block.definition.version}.${block.definition.kind}' is ready. To install:`);
  console.log();
  console.log(`  helm upgrade --install ${block.definition.kind.toLowerCase()}-block ${output}`);
  console.log();
};
