import path from "path";
import fs from "fs";
import { App, Chart } from "cdk8s";
import { Operator } from "./operator";
import { Worker } from "./worker";
import { BlockMetadata } from "./metadata";
import { CustomResourceDefinition } from "./crd";
import { JsonSchemaProps } from "../imports/k8s";
import { ConfigMapFromDirectory, createTgzBase64 } from "./configmap";
import packageJson from "../package.json";
import { Control } from "./control";
import { Manifest } from "../types/index.js";
import { Construct } from "constructs";

interface Options {
  block: Manifest;
  archiveSource?: string;
  output: string;
  force?: boolean;
}

export interface BlockProps {
  block: Manifest;
  archiveSource?: string;
}

export class Block extends Chart {
  constructor(scope: Construct, id: string, props: BlockProps) {
    super(scope, id);

    const { block, archiveSource } = props;
    console.log("manifest:", block);

    const configmap = new ConfigMapFromDirectory(this, "ConfigMapVolume", {
      block: block,
      archiveSource,
      namespace: block.operator?.namespace,
    });
  
    const redisServiceName = `${block.definition.kind.toLocaleLowerCase()}-redis`;
    const workers = block.operator?.workers ?? 1;
  
    if (packageJson.version === "0.0.1" && !process.env.KBLOCKS_OPERATOR_IMAGE) {
      throw new Error("Building from source, KBLOCKS_OPERATOR_IMAGE is not set, please set it to the image you want to use (e.g. 'wingcloudbot/kblocks-operator:0.1.13')");
    }
  
    const image = process.env.KBLOCKS_OPERATOR_IMAGE 
      ?? `wingcloudbot/kblocks-operator:${packageJson.version === "0.0.0" ? "latest" : packageJson.version}`;
  
    new Operator(this, "Operator", {
      image,
      configMaps: configmap.configMaps,
      redisServiceName,
      workers,
      ...block.operator,
      ...block.definition
    });
  
    if (packageJson.version === "0.0.1" && !process.env.KBLOCKS_WORKER_IMAGE) {
      throw new Error("Building from source, KBLOCKS_WORKER_IMAGE is not set, please set it to the image you want to use (e.g. 'wingcloudbot/kblocks-worker:0.1.13')");
    }
  
    const workerImage = process.env.KBLOCKS_WORKER_IMAGE 
      ?? `wingcloudbot/kblocks-worker:${packageJson.version === "0.0.0" ? "latest" : packageJson.version}`;
  
    new Worker(this, "Worker", {
      image: workerImage,
      configMaps: configmap.configMaps,
      ...block.operator,
      ...block.definition,
      replicas: workers,
      env: {
        // redis url should be the url of the redis instance in the operator
        REDIS_URL: `redis://${redisServiceName}.${block.operator?.namespace ?? "default"}.svc.cluster.local:${6379}`,
        ...block.operator?.env,
      }
    });
  
    const controlImage = process.env.KBLOCKS_CONTROL_IMAGE
      ?? `wingcloudbot/kblocks-control:${packageJson.version === "0.0.0" ? "latest" : packageJson.version}`;
  
    new Control(this, "Control", {
      image: controlImage,
      configMaps: configmap.configMaps,
      ...block.operator,
      ...block.definition,
    });
  
    const schema = resolveSchema(block);
  
    const metaNamespace = block.operator?.namespace ?? "default";
    const meta = new BlockMetadata(this, "Metadata", {
      resourceName: block.definition.kind,
      ...block.definition,
      namespace: metaNamespace,
    });

    const annotations: Record<string, string> = {
      "kblocks.io/metadata-name": meta.name,
      "kblocks.io/metadata-namespace": metaNamespace,
    };
  
    if (block.definition.icon) {
      annotations["kblocks.io/icon"] = block.definition.icon;
    }
  
    if (block.definition.color) {
      annotations["kblocks.io/color"] = block.definition.color;
    }
  
    new CustomResourceDefinition(this, "CRD", {
      ...block.definition,
      annotations,
      schema,
    });
  }
}

export async function build(opts: Options) {
  const block = opts.block;

  fs.mkdirSync(opts.output, { recursive: true });

  const app = new App();
  new Block(app, block.definition.kind.toLocaleLowerCase(), { block, archiveSource: opts.archiveSource });

  app.synth();

  // write the chart file to the output directory
  const outputDir = path.resolve(opts.output);
  fs.writeFileSync(path.join(outputDir, `Chart.yaml`),
`apiVersion: v1
name: ${block.definition.kind.toLocaleLowerCase()}-kblock
version: ${process.env.KBLOCKS_VERSION ?? "0.0.1"}
`);
}

function resolveSchema(props: Manifest): JsonSchemaProps {
  if (props.definition.schema) {
    return props.definition.schema;
  }

  throw new Error("No schema found");
}
