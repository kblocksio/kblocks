import fs from "fs";
import yaml from "yaml";
import { ApiObject, Manifest } from "./api";
import { generateSchemaFromWingStruct } from "./wing-schema";
import path from "path";
import $RefParser from '@apidevtools/json-schema-ref-parser';

export function writeManifest(manifest: string, blockObject: ApiObject, additionalObjects: ApiObject[]) {
  const docs = [
    yaml.stringify(blockObject),
    ...additionalObjects.map(o => yaml.stringify(o))
  ];

  fs.writeFileSync(manifest, docs.join("\n---\n"));
}

export function readManifest(manifest: string) {
  const docs = yaml.parseAllDocuments(fs.readFileSync(manifest, "utf8"));

  const additionalObjects = [];
  let blockObject: ApiObject | undefined;
  for (const doc of docs) {
    const json = doc.toJSON();
    const apiObject = json as ApiObject;

    if (apiObject.kind === "Block") {
      if (apiObject.apiVersion === "kblocks.io/v1" && apiObject.kind === "Block") {
        blockObject = apiObject;
      } else {
        additionalObjects.push(json);
      }
    }
  }

  return { blockObject, additionalObjects };
}


export async function resolveExternalAssets(spec: Manifest) {
  let readme;
  if (spec.definition.readme) {
    readme = await fs.promises.readFile(spec.definition.readme, "utf8");
  } else {
    console.warn("No readme file");
  }

  const schema = await resolveSchema(spec.definition.schema, spec.definition.kind);

  return {
    ...spec,
    definition: {
      ...spec.definition,
      schema,
      readme,
    }
  };
}

async function resolveSchema(schema: string | undefined, kind: string) {
  if (!schema || typeof(schema) !== "string") {
    throw new Error("No schema file found in kblock manifest. Please define the schema file under the 'schema' field of the 'definition' section of the manifest. Supported formats are .schema.json and .w files.");
  }

  if (schema.endsWith(".schema.json")) {
    const dereferencedSchema = await $RefParser.dereference(schema);
    if ('$defs' in dereferencedSchema) {
        delete (dereferencedSchema as any).$defs;
    }

    delete dereferencedSchema["$schema"];
    delete dereferencedSchema["$id"];
    // Add order annotations to properties
    function addOrderAnnotations(properties: any, startIndex: number = 1, isAdditionalProperties: boolean = false  ): number {
      let currentIndex = startIndex;
      for (const [key, value] of Object.entries(properties)) {
        if (typeof value === 'object' && value !== null) {
          const typedValue = value as { 
            type?: string, 
            properties?: any, 
            items?: any, 
            description?: string,
            additionalProperties?: any  // Add this line
          };
          if (!isAdditionalProperties) {
            typedValue.description = `${typedValue.description || ''}\n@order ${currentIndex}`;
          }
          
          if ((typedValue.type === 'object' || isAdditionalProperties) && typedValue.properties) {
            addOrderAnnotations(typedValue.properties, 1);
          } if (typedValue.type === 'object' && typedValue.additionalProperties) {
            addOrderAnnotations(typedValue.additionalProperties, 1, true);
          }else if (typedValue.type === 'array' && typedValue.items && typeof typedValue.items === 'object' && 'properties' in typedValue.items) {
            addOrderAnnotations(typedValue.items.properties, 1);
          }
          currentIndex++;
        }
      }
      return currentIndex;
    }

    if (dereferencedSchema.properties) {
      addOrderAnnotations(dereferencedSchema.properties);
    }
    return dereferencedSchema;
  }

  if (schema.endsWith(".w")) {
    console.log(`Rendering block schema from ${schema}/${kind}Spec`);
    return generateSchemaFromWingStruct(path.resolve(path.dirname(schema)), `${kind}Spec` );
  }

  throw new Error(`Unsupported schema file format: ${schema}. Only .schema.json and .w files are supported.`);
}
