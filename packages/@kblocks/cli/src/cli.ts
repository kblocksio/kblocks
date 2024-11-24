import yargs from "yargs";
import { ENGINES } from "./api";
import path from "path";
import { enrich } from "./enrich";
import { readManifest, writeManifest } from "./manifest-util";
import { catalogCommand, initCommand, listProjectTemplates } from "./init";
import { buildCommand } from "./build";
import { installCommand } from "./install";
import { importCommand } from "./import";

export async function cli() {

  return yargs
    .help()

    .command("build [DIR..]", "Builds a Helm chart for a block from source", yargs => yargs
      .positional("DIR", {
        description: "The directories containing the blocks",
        type: "string",
        array: true,
        required: false,
      })
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
      .option("env", {
        alias: "e",
        description: "Environment variables to set in the build environment",
        type: "string",
        array: true,
        coerce: (values: string[]) => {
          if (!values || values.length === 0) {
            return {};
          }

          return values.reduce((acc: Record<string, string>, curr: string | undefined) => {
            if (!curr) {
              return acc;
            }

            const [key, value] = curr.split('=');
            acc[key] = value ?? key;
            return acc;
          }, {});
        },
        required: false,
        default: "",
      }), argv => buildCommand(argv))

    .command("enrich [DIR]", "Enrich the kblock manifest with docs, description, icon and other good stuff (using AI)", yargs => yargs
      .positional("DIR", {
        description: "The directory containing the block",
        type: "string",
        required: false,
      })
      .option("engine", {
        description: "The provisioning engine to use for this block",
        type: "string",
        required: true,
        options: ["helm", "wing"],
        default: "helm",
      })
      .option("manifest", {
        alias: "m",
        description: "Block manifest",
        type: "string",
        required: false,
        default: "kblock.yaml",
      }), argv => enrichCommand(argv))

    .command("init <TEMPLATE> <DIR>", "Initialize a new block project in a new directory", yargs => yargs
      .positional("TEMPLATE", {
        description: "The project template to use for the new block",
        type: "string",
        required: true,
        options: Object.keys(listProjectTemplates()),
      })
      .positional("DIR", {
        description: "The directory to initialize",
        type: "string",
        required: true,
      })
      .option("group", {
        description: "Kubernetes custom resource group (e.g. 'acme.com')",
        alias: "g",
        type: "string",
        required: false,
      })
      .option("api-version", {
        description: "Kubernetes custom resource API version (e.g. v1)",
        alias: "v",
        type: "string",
        default: "v1",
        required: false,
      })
      .option("kind", {
        description: "Kubernetes custom resource kind, pascal case (e.g. 'Foo')",
        alias: "k",
        type: "string",
        required: false,
      })
      .option("plural", {
        description: "Kubernetes custom resource plural, all lowercase (e.g. 'foos')",
        alias: "p",
        type: "string",
        required: false,
      })
      .option("singular", {
        description: "The singular name for the new block, all lowercase (e.g. 'foo')",
        type: "string",
        required: false,
      })
      .option("icon", {
        description: "The icon for the new block",
        type: "string",
        required: false,
      })
      .option("color", {
        description: "The color style for the new block",
        type: "string",
        required: false,
      })
      .option("category", {
        description: "The Kubernetes resource category for the new block, can be specified multiple times (e.g. '--category Storage --category Network')",
        type: "string",
        array: true,
        required: false,
      })
      .option("short-name", {
        description: "The short names for the new block, can be specified multiple times (e.g. '--short-name f --short-name fu')",
        type: "string",
        array: true,
        required: false,
      })
      .option("list-kind", {
        description: "The Kubernetes 'list kind' for the new block (e.g. 'FooList')",
        type: "string",
        required: false,
      })
      .option("description", {
        description: "The description for the new block",
        type: "string",
        required: false,
      })
      .option("import", {
        description: "Import the schema from kubernetes",
        type: "boolean",
        required: false,
      })
      .epilogue(templatesHelp()), argv => initCommand(argv))

    .command("catalog", "Outputs a JSON catalog of all available init project types", argv => catalogCommand())

    .command("import", "Imports and writes a schema to a file from kubernetes", yargs => yargs
      .positional("DIR", {
        description: "The directory containing the block to write the schema to",
        type: "string",
        required: false,
      })
      .option("group", {
        description: "Kubernetes resource group (e.g. 'acme.com')",
        alias: "g",
        type: "string",
        required: true,
      })
      .option("api-version", {
        description: "Kubernetes resource API version (e.g. v1)",
        alias: "v",
        type: "string",
        default: "v1",
        required: true,
      })
      .option("kind", {
        description: "Kubernetes resource kind, pascal case (e.g. 'Foo')",
        alias: "k",
        type: "string",
        required: true,
      }), argv => importCommand(argv))

    .command("install [DIR..]", "Install a block to a cluster", yargs => yargs
      .positional("DIR", {
        description: "The directory containing the block",
        type: "string",
        required: false,
        array: true,
      })
      .option("output", {
        alias: "o",
        description: "Where to write the output Helm chart",
        type: "string",
        required: false,
        default: "./dist",
      })
      .option("release-name", {
        description: "The Helm release name for the block (default: '<kind>-block')",
        type: "string",
        required: false,
      })
      .option("manifest", {
        alias: "m",
        description: "Block manifest file location",
        type: "string",
        required: false,
        default: "kblock.yaml",
      })
      .option("namespace", {
        description: "The namespace to install the block into",
        alias: "n",
        type: "string",
        required: false,
      })
      .option("env", {
        alias: "e",
        description: "Environment variables to set in the build environment",
        type: "string",
        array: true,
        coerce: (values: string[]) => {
          if (!values || values.length === 0) {
            return {};
          }

          return values.reduce((acc: Record<string, string>, curr: string | undefined) => {
            if (!curr) {
              return acc;
            }

            const [key, value] = curr.split('=');
            acc[key] = value ?? key;
            return acc;
          }, {});
        },
        required: false,
        default: "",
      }), argv => installCommand(argv))

    .showHelpOnFail(false)
    .fail((message, err) => {
      if (message) {
        console.error(message);
      }

      if (err) {
        if (process.env.DEBUG) {
          console.error(err.stack);
        } else {
          console.error(err.message);
        }
      }

      process.exit(1);
    })
    .argv;
}

const enrichCommand = async (opts: { manifest: string, DIR?: string }) => {
  if (opts.DIR) {
    process.chdir(opts.DIR);
  }

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

function templatesHelp(): string {
  const lines = [];

  lines.push("");
  lines.push("Supported project templates: ");
  lines.push("");

  const catalog = listProjectTemplates();

  for (const [t, m] of Object.entries(catalog)) {
    lines.push(`${t}: ${m.description}`);
    lines.push("");
  }

  return lines.join("\n");
}