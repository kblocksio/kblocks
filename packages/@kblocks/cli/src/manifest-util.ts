import fs from "fs";
import yaml from "yaml";
import { ApiObject, LAST_STATE_HASH_ATTRIBUTE, Manifest, TFSTATE_ATTRIBUTE } from "@kblocks/api";
import { generateSchemaFromWingStruct } from "./wing-schema";
import path from "path";
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { JsonSchemaProps } from "../imports/k8s";
import { execSync } from "child_process";

let tmpSrcCounter = 0;

export function writeManifest(manifest: string, blockObject: ApiObject, additionalObjects: ApiObject[]) {
  const docs = [
    yaml.stringify(blockObject),
    ...additionalObjects.map(o => yaml.stringify(o))
  ];

  fs.writeFileSync(manifest, docs.join("\n---\n"));
}

export async function getManifest(opts: { dir: string, manifest: string, outdir: string }) {
  const manifestPath = path.resolve(opts.dir, opts.manifest);
  const { blockObject, additionalObjects } = readManifest(manifestPath);
  if (!blockObject) {
    throw new Error(`Unable to find a kblocks.io/v1 Block object in ${manifestPath}`);
  }

  const tmpSrc = path.join(opts.outdir, `tempSrc-${blockObject.spec.definition.kind.toLowerCase()}-${tmpSrcCounter++}`);
  const manifest: Manifest = await resolveExternalAssets(opts.dir, blockObject.spec, tmpSrc);
  return { manifest, additionalObjects, tmpSrc };
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


export async function resolveExternalAssets(dir: string, spec: Manifest, tmpSrc: string | undefined, skipLint: boolean = false) {
  let readme;
  let schema;
  if (spec.definition) {
    if (spec.definition.readme) {
      readme = await fs.promises.readFile(path.join(dir, spec.definition.readme), "utf8");
    } else {
      console.warn("No readme file");
    }

    schema = await resolveSchema(path.join(dir, spec.definition.schema), spec.definition.kind, spec.engine);
    
    if (!skipLint) {
      if (!tmpSrc) {
        throw new Error("tmpSrc is required to lint the schema");
      }
      await lintSchema(dir,schema, spec.engine, tmpSrc);
    }
  }

  if (spec.include) {
    spec.include = spec.include.map((include: string) => path.join(dir, include));
  }

  return {
    ...spec,
    ...(spec.definition ? {
      definition: {
        ...spec.definition,
        schema,
        readme,
      }
    } : {})
  } satisfies Manifest;
}

async function lintSchema(dir: string, schema: string, engine: string, tmpSrc: string) {
  if (engine === "helm") {
    // Create a temporary source directory in the output
    if (fs.existsSync(tmpSrc)) {
      fs.rmSync(tmpSrc, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpSrc, { recursive: true });

    // Copy source directory to temporary location recursively
    const srcDir = path.join(dir, 'src');
    if (!fs.existsSync(srcDir)) {
      throw new Error(`No 'src' directory found in the provided directory. Please ensure that the source directory is named 'src'.`);
    }
    fs.cpSync(srcDir, tmpSrc, { recursive: true });

    // Write the materialized schema to the temporary location
    fs.writeFileSync(path.join(tmpSrc, "values.schema.json"), JSON.stringify(schema));

    // Run helm lint to validate the schema
    const lintResult = execSync("helm lint .", { stdio: "inherit", cwd: tmpSrc });
    console.log(lintResult.toString());
  }
}

async function resolveSchema(schema: string | undefined, kind: string, engine: string | undefined) {
  if (!schema || typeof(schema) !== "string") {
    throw new Error("No schema file found in kblock manifest. Please define the schema file under the 'schema' field of the 'definition' section of the manifest. Supported formats are .schema.json and .w files.");
  }

  if (schema.endsWith(".schema.json")) {
    // Ensure schema is in src folder
    if (!schema.match(/\/src\/[^\/]+\.json$/)) {
      throw new Error(`Schema file must be located in the src directory ${schema}`);
    }
    if (engine === "helm" && !schema.endsWith("src/values.schema.json")) {
      throw new Error(`Schema file must be named 'values.schema.json' when using the helm engine. ${schema}`);
    }
    const dereferencedSchema = await $RefParser.dereference(schema);
    if ('$defs' in dereferencedSchema) {
        delete (dereferencedSchema as any).$defs;
    }

    delete dereferencedSchema["$schema"];
    delete dereferencedSchema["$id"];
    // Add order annotations to properties
    function addOrderAnnotations(properties: any, startIndex: number = 1, isAdditionalProperties: boolean = false  ): number {
      let currentIndex = startIndex;
      for (const value of Object.values(properties)) {
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


/**
 * Adds the base schema to the block schema (status, conditions, etc.)
 */
export function renderStatusSchema(block: Manifest): JsonSchemaProps {
  const engine = block.engine;
  const blockSchema = block.definition.schema;
  const outputs = block.definition.outputs ?? [];

  // if this is a non-CRD block (e.g. "Pod"), then the schema is already complete and we can just
  // return it as is.
  if (block.operator?.skipCrd) {
    return blockSchema.properties?.status;
  }

  if (blockSchema.properties?.status && blockSchema.properties?.status.type !== "object") {
    throw new Error("'status' attribute must be of type 'object'");
  }

  const status = blockSchema.properties?.status ?? {
    type: "object",
    properties: {},
  };

  const props = status.properties;
  if (!props) {
    throw new Error("'status' attribute must be of type 'object' and have a `properties` field");
  }

  // validate that all outputs defined in the `status` section of the schema are also defined in the
  // `outputs` section of the kblocks definition
  for (const k of Object.keys(props)) {
    if (!outputs.includes(k)) {
      console.log({props});
      throw new Error(`output '${k}' is defined in the schema's 'status' section but not in the 'outputs' section of the block manifest`);
    }
  }

  props[LAST_STATE_HASH_ATTRIBUTE] = {
    type: "string",
    description: "The hash of the last object state.\n\n@ui kblocks.io/hidden",
  };

  // if conditions are already defined in the schema, throw an error
  if (props.conditions) {
    throw new Error("'conditions' attribute is not allowed in the 'status' section of the schema unless the operator is configured with 'skipCrd: true'");
  }

  props.conditions = {
    type: "array",
    description: "The conditions of the resource.\n\n@ui kblocks.io/hidden",
    items: {
      type: "object",
      description: "Indicates if the resource is ready",
      properties: {
        type: { type: "string" },
        status: { type: "string" },
        lastTransitionTime: { type: "string", format: "date-time" },
        lastProbeTime: { type: "string", format: "date-time" },
        message: { type: "string" },
        reason: { type: "string" },
      },
      required: ["type", "status", "lastTransitionTime"],
    },
  };

  if (engine === "tofu" || engine.startsWith("wing/tf-")) {
    props[TFSTATE_ATTRIBUTE] = { 
      type: "string",
      description: "The last Terraform state of the resource.\n\n@ui kblocks.io/hidden",
    };
  }

  for (const o of outputs) {
    props[o] = { type: "string" };
  }

  return status;
}
