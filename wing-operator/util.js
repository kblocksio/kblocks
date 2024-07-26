import { spawnSync } from "child_process";
import { chmodSync, cpSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

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

export function generateSchemaFromWingStruct(source, struct) {
  const tmpfile = join(source, ".tmp.schema.main.w");
  writeFileSync(tmpfile, `
    bring "./" as l;
    log(l.${struct}.schema().asStr());
  `);

  const result = spawnSync("wing", ["compile", tmpfile]);
  if (result.status !== 0) {
    throw new Error(`wing compile ${tmpfile} failed with status ${result.status}`);
  }

  rmSync(tmpfile, { recursive: true, force: true });
  rmSync(join(source, "target"), { recursive: true, force: true });

  const out = JSON.parse(result.stdout.toString());
  return cleanupSchema(out);
}


function cleanupSchema(schema) {
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

  if ("status" in schema.properties) {
    throw new Error("status property already exists");
  }

  schema.properties.status = {
    type: "object",
    additionalProperties: true,
  };

  return schema;
}