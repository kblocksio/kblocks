import { build } from "./build";
import { chdir } from "./util";
import { execSync } from "child_process";
export interface InstallOptions {
  DIR?: string;
  namespace?: string;
  manifest: string;
  output: string;
  releaseName?: string;
}

export async function installCommand(argv: InstallOptions) {
  return chdir(argv.DIR, async () => {

    const { outdir, manifest } = await build({
      manifest: argv.manifest,
      output: argv.output,
      silent: true,
    });

    const command = [];

    command.push("helm", "upgrade", "--install");

    if (argv.namespace) {
      command.push("--namespace", argv.namespace);
      command.push("--create-namespace");
    }

    const releaseName = argv.releaseName || `${manifest.definition.kind.toLowerCase()}-block`;
    command.push(releaseName);
    command.push(outdir);

    execSync(command.join(" "), { stdio: "inherit" });

    console.log("");
    console.log("To uninstall:");
    console.log("");
    console.log(`  helm uninstall ${releaseName}`);
    console.log("");
  });
}
