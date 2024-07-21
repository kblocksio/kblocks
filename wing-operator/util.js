import { spawnSync } from "child_process";
import { chmodSync, cpSync } from "fs";

export function docker(args, cwd) {
  return spawnSync("docker", args, { stdio: "inherit", cwd });
}

export function makeExecutable(file) {
  chmodSync(file, 0o755);
}

export function copyDir(src, dest) {
  cpSync(src, dest, { recursive: true, filter: (src) => !src.includes("node_modules") });
}

export function cleanupSchema(schema) {
  delete schema.$id;

  const visit = node => {
    if (typeof(node) === "object") {
      if (Array.isArray(node)) {
        node.forEach(visit);
      } else {
        if ("patternProperties" in node) {
          delete node.patternProperties;
          node.additionalProperties = true;
        }

        for (const v of Object.values(node)) {
          visit(v);
        }        
      }
    }
  };

  visit(schema);

  return schema;
}