import { join } from "path";
import fs from "fs";
import { spawnSync } from "child_process";

export function generateSchemaFromWingStruct(source: string, struct: string) {
  const tmpfile = join(source, ".tmp.schema.main.w");
  fs.writeFileSync(tmpfile, `
    bring "./" as l;
    log(l.${struct}.schema().asStr());
  `);

  const result = spawnSync("wing", ["compile", tmpfile], { cwd: source });
  if (result.status !== 0) {
    console.error(result.stderr.toString());
    throw new Error(`wing compile ${tmpfile} failed with status ${result.status}`);
  }

  fs.rmSync(tmpfile, { recursive: true, force: true });
  fs.rmSync(join(source, "target"), { recursive: true, force: true });

  const out = JSON.parse(result.stdout.toString());
  return cleanupSchema(out);
}

function cleanupSchema(schema: any) {
  delete schema.$id;

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
