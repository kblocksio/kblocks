import path from "path";
import fs from "fs";
import os from "os";
import { spawnSync } from "child_process";

interface BuildImageOptions {
  readonly engine: string;
  readonly apiVersion: string;
  readonly kind: string;
}

export async function buildImage(sourcedir: string, tag: string, options: BuildImageOptions) {
  const dockerfile = require.resolve("@kblocks/controller/Dockerfile");
  const basetag = "kblocks-controller-base";
  docker(["build", "-t", basetag, "-f", path.basename(dockerfile), "."], path.dirname(dockerfile));

  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "image-"));
  fs.cpSync(sourcedir, path.join(tmpdir, "kblock"), { recursive: true, dereference: true });
  fs.writeFileSync(path.join(tmpdir, "kblock.json"), JSON.stringify({
    engine: options.engine,
    config: {
      configVersion: "v1",
      kubernetes: [
        {
          apiVersion: options.apiVersion,
          kind: options.kind,
          executeHookOnEvent: ["Added", "Modified", "Deleted"]
        }
      ]  
    }
  }));

  fs.writeFileSync(path.join(tmpdir, "Dockerfile"), [
    `FROM ${basetag}`,
    "COPY kblock /kblock",
    "COPY kblock.json /hooks/kblock.json",
    "RUN cd /kblock && ([ -f package.json ] && npm i --omit=dev || true)",
    "RUN cd /kblock && ([ -f Chart.yaml ] && helm dependency update || true)",
  ].join("\n"));

  docker(["build", "-t", tag, "."], tmpdir);
  docker(["push", tag]);
}

export function docker(args: string[], cwd?: string) {
  console.log(`$ docker ${args.join(" ")} ${cwd ? `in ${cwd}` : ""}`);
  const result = spawnSync("docker", args, { stdio: "inherit", cwd });
  if (result.status !== 0) {
    throw new Error(`docker ${args.join(" ")} failed with status ${result.status}`);
  }
}
