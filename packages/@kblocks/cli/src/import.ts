import { execSync } from "child_process";
import { writeFileSync } from "fs";
import path from "path";
import $RefParser from '@apidevtools/json-schema-ref-parser';

export interface ImportOptions {
  DIR?: string;
  group: string;
  apiVersion: string;
  kind: string;
}

export async function importCommand(argv: ImportOptions) {
  const data = execSync(`kubectl get --raw /openapi/v2`, {
    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    encoding: 'utf8',
    env: {
      ...process.env,
    },
  })
  const schema = JSON.parse(data.toString());
  const dereferencedSchema = await $RefParser.dereference(schema);
  const definition = Object.values(dereferencedSchema.definitions ?? {}).find((d: any) => {
    const gvks = d["x-kubernetes-group-version-kind"] ?? [];
    return gvks.some((gvk: any) => {
      return gvk.group === argv.group &&
        gvk.version === argv.apiVersion &&
        gvk.kind === argv.kind;
    });
  });

  if (!definition) {
    throw new Error(`Could not find definition for ${argv.group}/${argv.apiVersion}/${argv.kind}`);
  }

  const keys = ["apiVersion", "kind", "metadata"];
  for (const key of keys) {
    delete definition.properties[key];
  }

  const outfile = path.join(argv.DIR ?? process.cwd(), "values.schema.json");
  writeFileSync(
    outfile,
    JSON.stringify(definition, null, 2)
  );

  console.log(`Wrote schema to ${outfile}`);
}
