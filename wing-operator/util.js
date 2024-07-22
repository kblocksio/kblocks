import { spawnSync } from "child_process";
import { chmodSync, cpSync } from "fs";

export function docker(args, cwd) {
  const result = spawnSync("docker", args, { stdio: "inherit", cwd });
  if (result.status !== 0) {
    throw new Error(`docker ${args.join(" ")} failed with status ${result.status}`);
  }
}

export function makeExecutable(file) {
  chmodSync(file, 0o755);
}

export function copy(src, dest) {
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