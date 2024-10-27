import { Manifest } from "../src/api/index.js";

import { zodToJsonSchema } from "zod-to-json-schema";
import yaml from "yaml";
import fs from "fs";
import path from "path";

const version = process.env.KBLOCKS_VERSION;
if (!version) {
  throw new Error("KBLOCKS_VERSION is not set");
}

const specSchema = filterAdditionalProperties(zodToJsonSchema(Manifest));
delete specSchema["$schema"];

const manifest = {
  apiVersion: "kblocks.io/v1",
  kind: "Block",
  metadata: {
    name: "kblock",
    namespace: "kblocks"
  },
  spec: {
    engine: "cdk8s",
    definition: {
      group: "kblocks.io",
      version: "v1",
      kind: "Block",
      plural: "blocks",
      readme: "README.md",
      icon: "heroicon://cube",
      schema: "./manifest.schema.json",
    },
    operator: {
      env: {
        "KBLOCKS_SYSTEM_ID": "{{ .Values.system }}",
      }
    }
  }
};

const chart = {
  apiVersion: "v1",
  name: "kblocks",
  version: version,
  description: "Kblocks is a platform for building and sharing Kubernetes blocks.",
  home: "https://kblocks.io",
  sources: [
    "https://github.com/kblocksio/kblocks"
  ],
}

const schema = {
  type: "object",
  properties: { spec: specSchema },
  required: ["spec"]
};

fs.writeFileSync(path.join(__dirname, "../manifest.schema.json"), JSON.stringify(schema, null, 2));
fs.mkdirSync(path.join(__dirname, "../templates"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "../Chart.yaml"), yaml.stringify(chart));
fs.writeFileSync(path.join(__dirname, "../kblock.yaml"), yaml.stringify(manifest));

function filterAdditionalProperties(obj: any): any {
  if (obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(filterAdditionalProperties);
  }
  
  
  if (typeof(obj) === "object") {
    if (Object.keys(obj).length === 1 && "allOf" in obj) {
      // union - merge the objects together
      let result: any = {
        type: "object",
        properties: {},
        required: []
      };

      for (const item of obj.allOf) {
        result.properties = {
          ...result.properties,
          ...filterAdditionalProperties(item.properties)
        };

        result.required = [
          ...result.required,
          ...(item.required || [])
        ];
      }

      return result;
    }

    if (Object.keys(obj).length === 1 && "anyOf" in obj) {
      obj["x-kubernetes-preserve-unknown-fields"] = true;
      delete obj.anyOf;
      return obj;
    }

    if (obj.additionalProperties === false) {
      delete obj.additionalProperties;
    }

    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {

      // special case for "any" which is represented as {} and should be represented as {"x-kubernetes-preserve-unknown-fields": true}
      if (typeof(value) === "object" && value !== null && Object.keys(value).length === 0) {
        newObj[key] = {
          "x-kubernetes-preserve-unknown-fields": true
        };
        continue;
      }

      newObj[key] = filterAdditionalProperties(value);
    }

    return newObj;
  }

  return obj;
}
