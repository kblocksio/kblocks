import yargs from "yargs";
import { synth } from "./build";
import fs from "fs";
import yaml from "yaml";
import { ApiObject, Manifest } from "./api";
import path from "path";
export async function cli() {
  return yargs
    .help()

    .command("build [path]", "Builds a Helm chart for a block from source", yargs => yargs
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

export interface Options {
  manifest: string;
  source: string;
  output: string;
}

export const buildCommand = async (opts: Options) => {
  const manifest = opts.manifest;
  const source = opts.source;
  const output = opts.output;

  // read the manifest file and extract the block manifest
  var { blockObject, additionalObjects } = readManifest(manifest);
  if (!blockObject) {
    throw new Error(`Unable to find a kblocks.io/v1 Block object in ${manifest}`);
  }

  const spec: Manifest = blockObject.spec;

  console.log("Block:", spec);

  // create the output directory
  fs.mkdirSync(output, { recursive: true });

  // Check if Chart.yaml exists in the manifest directory
  const manifestDir = path.dirname(manifest);
  const chartPath = path.join(manifestDir, 'Chart.yaml');
  if (fs.existsSync(chartPath)) {
    fs.copyFileSync(chartPath, path.join(output, 'Chart.yaml'));
  }

  synth({ block: blockObject.spec, source, output });

  // write any additional objects to the templates directory
  if (additionalObjects.length > 0) {
    const additionalObjectsManifest = path.join(output, "templates", "additional-objects.yaml");
    fs.writeFileSync(additionalObjectsManifest, yaml.stringify(additionalObjects));
  }
  console.log();
  console.log("-------------------------------------------------------------------------------------------------------------------");
  console.log(`Block '${spec.definition.group}/${spec.definition.version}.${spec.definition.kind}' is ready. To install:`);
  console.log();
  console.log(`  helm upgrade --install ${spec.definition.kind.toLowerCase()}-block ${output}`);
  console.log();
};

function readManifest(manifest: string) {
  const docs = yaml.parseAllDocuments(fs.readFileSync(manifest, "utf8"));

  const additionalObjects = [];
  let blockObject: ApiObject | undefined;
  for (const doc of docs) {
    const json = doc.toJSON();
    const apiObject = json as ApiObject;

    if (apiObject.kind === "Block") {
      if (apiObject.apiVersion === "kblocks.io/v1" && apiObject.kind === "Block") {
        blockObject = apiObject;
      } else {
        additionalObjects.push(json);
      }
    }
  }
  return { blockObject, additionalObjects };
}

