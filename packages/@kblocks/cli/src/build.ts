import path from "path";
import fs from "fs/promises";
import yaml from "yaml";
import { Manifest, readManifest } from "./types";
import { App, Chart } from "cdk8s";
import { Operator } from "./operator";
import { BlockMetadata } from "./metadata";
import { CustomResourceDefinition } from "./crd";
import { JsonSchemaProps } from "../imports/k8s";
import { generateSchemaFromWingStruct } from "./wing";
// import { buildImage } from "./image";
// import { hashAll } from "./util";
import { docs } from "./docs";
import { ConfigMapFromDirectory, createTgzBase64 } from "./configmap";
import packageJson from "../package.json";

interface Options {
  path: string;
  output: string;
  force?: boolean;
}

export async function build(opts: Options) {
  await docs(opts);

  const kblockDir = path.resolve(opts.path);
  const block = readManifest(kblockDir);  

  const app = new App({ outdir: path.join(opts.output, "templates") });
  const chart = new Chart(app, block.definition.kind.toLocaleLowerCase());

  const tgzBase64 = await createTgzBase64(kblockDir);
  const configmap = new ConfigMapFromDirectory(chart, "ConfigMapVolume", {
    path: kblockDir,
    archive: tgzBase64,
    namespace: block.operator.namespace,
  });

  // const image = await buildImage(kblockDir, { push: true });

  new Operator(chart, "Operator", {
    image: `wingcloudbot/kblocks-controller:${packageJson.version === "0.0.0" ? "latest" : packageJson.version}`,
    configMaps: configmap.configMaps,
    ...block.operator,
    ...block.definition
  });

  const schema = await resolveSchema(kblockDir, block);

  const meta = new BlockMetadata(chart, "Metadata", {
    dir: kblockDir,
    ...block.definition,
    namespace: block.operator.namespace,
  });

  new CustomResourceDefinition(chart, "CRD", {
    ...block.definition,
    annotations: {
      "kblocks.io/icon": block.definition.icon,
      "kblocks.io/metadata": meta.name,
      "kblocks.io/docs": meta.name,
    },
    schema,
  });

  app.synth();

  // write the chart file to the output directory
  const outputDir = path.resolve(opts.output);
  await fs.writeFile(path.join(outputDir, `Chart.yaml`),
`apiVersion: v1
name: ${block.definition.kind.toLocaleLowerCase()}-kblock
version: 0.0.1
type: application
`);
}

async function resolveSchema(sourcedir: string, props: Manifest): Promise<JsonSchemaProps> {
  // in an explicit schema is set, use it.
  if (props.definition.schema) {
    return props.definition.schema;
  }

  // for wing, we can generate a schema from the struct
  if (props.engine.startsWith("wing") || props.engine === "wing") {
    return generateSchemaFromWingStruct(sourcedir, `${props.definition.kind}Spec`);
  }

  // for helm and tofu, we can read the schema from the values.schema.json file
  if (props.engine === "helm" || props.engine === "tofu") {
    const schemaFile = `${sourcedir}/values.schema.json`;

    if (!(await fs.access(schemaFile, fs.constants.R_OK).then(() => true).catch(() => false))) {
      console.warn(`warning: no 'values.schema.json' under ${sourcedir}, assuming empty schema`);
      return {
        type: "object",
        properties: {},
      };
    }

    const x = JSON.parse(await fs.readFile(schemaFile, "utf8"));
    delete x.$schema;
    return x;
  }

  throw new Error(`unsupported engine: ${props.engine}`);
}

