import { join } from "path";
import fs from "fs";
import cp from "child_process";

function wingcli(cwd: string, args: string[]) {
  const cli = require.resolve("winglang/bin/wing");
  
  return cp.spawnSync(cli, args, { cwd });
}

export function generateSchemaFromWingStruct(workdir: string, struct: string) {
  const tmpfile = join(workdir, ".tmp.schema.main.w");
  
  fs.writeFileSync(tmpfile, [
    `bring "./" as lib;`,
    `log(lib.${struct}.schema().asStr());`
  ].join("\n"));

  const result = wingcli(workdir, ["compile", tmpfile]);
  if (result.status !== 0) {
    console.error(result.stderr.toString());
    throw new Error(`wing compile ${tmpfile} failed with status ${result.status}`);
  }

  fs.rmSync(tmpfile, { recursive: true, force: true });
  fs.rmSync(join(workdir, "target"), { recursive: true, force: true });

  const out = JSON.parse(result.stdout.toString());
  return cleanupSchema(out);
}

function cleanupSchema(schema: any) {
  delete schema.$id;

  // if "metadata" is present, remove it because it is implicitly added to all objects in k8s anyway
  delete schema.properties?.metadata;

  const visit = (node: any) => {
    if (typeof(node) === "object") {
      if (Array.isArray(node)) {
        node.forEach(visit);
      } else {
        if ("patternProperties" in node) {
          const inner = node.patternProperties[".*"] ?? true;

          delete node.patternProperties;
          
          node.additionalProperties = inner;
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
