import { build } from "./build";
import { execSync } from "child_process";
export interface InstallOptions {
  DIR?: string;
  namespace?: string;
  manifest: string;
  output: string;
  releaseName?: string;
  env: Record<string, string>;
}

export async function installCommand(argv: InstallOptions) {
  const { outdir, names } = await build({
    manifest: argv.manifest,
    dir: argv.DIR ?? process.cwd(),
    output: argv.output,
    silent: true,
    env: argv.env,
  });

  // Run helm lint on the output directory before installing - this verifies that the CRD is valid
  execSync("helm lint .", { stdio: "inherit", cwd: outdir });

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
