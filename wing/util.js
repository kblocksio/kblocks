import { spawnSync } from "child_process";
import { chmodSync } from "fs";

export function docker(args, cwd) {
  return spawnSync("docker", args, { stdio: "inherit", cwd });
}

export function makeExecutable(file) {
  chmodSync(file, 0o755);
}