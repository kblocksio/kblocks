import yargs from "yargs";
import cp from "child_process";
import path from "path";
export async function cli() {
  return yargs
    .help()

    .command("build [path]", "Build the kblock in the current directory", yargs => yargs
      .option("output", {
        alias: "o",
        description: "The output directory",
        type: "string",
        required: true,
      })
      .option("values", {
        alias: "v",
        description: "The values file to use",
        type: "string",
        required: true,
      })
      .option("source", {
        alias: "s",
        description: "The archive source directory to use",
        type: "string",
        required: true,
      }), argv => build(argv))

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
  values: string;
  source: string;
  output: string;
}

export const build = (opts: Options) => {
  const values = opts.values;
  const source = opts.source;
  const output = opts.output;
  const templates = path.join(output, "templates");

  const { stdout, stderr } = cp.spawnSync("npx", ["cdk8s", "synth", "--app", `"tsx ${__dirname}/index.ts"`, "--output", templates], {
    env: {
      ...process.env,
      KBLOCKS_VALUES_FILE: values,
      KBLOCKS_OUTPUT_DIR: output,
      KBLOCKS_ARCHIVE_SOURCE: source,
    },
    stdio: "pipe"
  });

  if (stdout) {
    console.log(stdout.toString("utf8"));
  }

  if (stderr) {
    console.error(stderr.toString("utf8"));
  }
};
