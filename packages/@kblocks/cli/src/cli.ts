import yargs from "yargs";
import { build } from "./build";
import { docs } from "./docs";

export async function cli() {
  return yargs
    .help()

    .command("build [path]", "Build the kblock in the current directory", yargs => yargs
      .option("force", {
        type: "boolean",
        alias: "f",
        describe: "Force the generation of the README and icon",
        default: false,
      })
      .option("output", {
        alias: "o",
        description: "The output directory",
        type: "string",
        default: "dist",
      })
      .positional("path", {
        type: "string",
        default: ".",
        describe: "The path to the kblock",
      }), argv => build(argv))

    .command("docs [path]", "Generate the documentation for the kblock in the current directory", yargs => yargs
      .option("force", {
        type: "boolean",
        alias: "f",
        describe: "Force the generation of the README and icon even if they already exist",
        default: false,
      })
      .positional("path", {
        type: "string",
        default: ".",
        describe: "The path to the kblock",
      }), argv => docs(argv))

    .showHelpOnFail(false)
    .fail((_, err) => {
      console.error(err.stack);
      process.exit(1);
    })
    .argv;
} 