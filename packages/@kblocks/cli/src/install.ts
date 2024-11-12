import { build } from "./build";
import { chdir } from "./util";
import { execSync } from "child_process";
export interface InstallOptions {
  DIR?: string[];
  namespace?: string;
  manifest: string;
  output: string;
  releaseName?: string;
  env: Record<string, string>;
  skipCrd?: boolean;
  flushOnly?: boolean;
}

export async function installCommand(argv: InstallOptions) {
  const requests = argv.DIR && argv.DIR.length > 0 ? argv.DIR.map(dir => ({
    manifest: argv.manifest,
    dir,
  })) : [{
    manifest: argv.manifest,
    dir: process.cwd(),
  }];

  const { outdir, names } = await build({
    requests,
    output: argv.output,
    silent: true,
    env: argv.env,
    skipCrd: argv.skipCrd,
    flushOnly: argv.flushOnly,
  });

  const command = [];

  command.push("helm", "upgrade", "--install");

  if (argv.namespace) {
    command.push("--namespace", argv.namespace);
    command.push("--create-namespace");
  }

  const releaseName = argv.releaseName || `${names}-block`;
  command.push(releaseName);
  command.push(outdir);

  execSync(command.join(" "), { stdio: "inherit", cwd: outdir });

  console.log("");
  console.log("To uninstall:");
  console.log("");
  console.log(`  helm uninstall ${releaseName}`);
  console.log("");
}
