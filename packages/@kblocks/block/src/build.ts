import path from "path";
import fs from "fs";
import { App, Chart } from "cdk8s";
import { Operator } from "./operator";
import { Worker } from "./worker";
import { BlockMetadata } from "./metadata";
import { CustomResourceDefinition } from "./crd";
import { JsonSchemaProps } from "../imports/k8s";
import { ConfigMapFromDirectory } from "./configmap";
import packageJson from "../package.json";
import { Control } from "./control";
import { Manifest } from "./api";
import { Construct } from "constructs";
import yaml from 'yaml';

export interface BlockProps {
  block: Manifest;
  source?: string;
}

interface Options extends BlockProps {
  output: string;
  force?: boolean;
}

export class Block extends Chart {
  constructor(scope: Construct, id: string, props: BlockProps) {
    super(scope, id);

    const { block, source } = props;

    const namespace = block.operator?.namespace ?? "{{ .Release.Namespace }}";
    const workers = block.operator?.workers ?? 1;

    const configmap = new ConfigMapFromDirectory(this, "ConfigMapVolume", {
      block,
      source,
      namespace,
    });
  
    const redisServiceName = `${block.definition.kind.toLocaleLowerCase()}-redis`;

    const image = {
      operator: calculateImageName("operator"),
      worker: calculateImageName("worker"),
      control: calculateImageName("control"),
    };
  
    new Operator(this, "Operator", {
      image: image.operator,
      configMaps: configmap.configMaps,
      redisServiceName,
      workers,
      ...block.operator,
      ...block.definition
    });
  
    new Worker(this, "Worker", {
      image: image.worker,
      configMaps: configmap.configMaps,
      ...block.operator,
      ...block.definition,
      replicas: workers,
      env: {
        // redis url should be the url of the redis instance in the operator
        REDIS_URL: `redis://${redisServiceName}.${namespace}.svc.cluster.local:${6379}`,
        ...block.operator?.env,

        // this can be used to spawn new blocks (e.g. byt the `Block` block).
        KBLOCKS_WORKER_IMAGE: image.worker,
        KBLOCKS_OPERATOR_IMAGE: image.operator,
        KBLOCKS_CONTROL_IMAGE: image.control,
      }
    });
  
    new Control(this, "Control", {
      image: image.control,
      configMaps: configmap.configMaps,
      ...block.operator,
      ...block.definition,
    });
  
    const schema = resolveSchema(block);
  
    const meta = new BlockMetadata(this, "Metadata", {
      resourceName: block.definition.kind,
      ...block.definition,
      namespace,
    });

    const annotations: Record<string, string> = {
      "kblocks.io/metadata-name": meta.name,
      "kblocks.io/metadata-namespace": namespace,
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

export async function synth(opts: Options) {
  const name = opts.block.definition.kind.toLocaleLowerCase();
  const outputDir = path.resolve(opts.output);
  
  const templatesdir = path.join(outputDir, "templates");
  fs.mkdirSync(templatesdir, { recursive: true });

  const app = new App({ outdir: templatesdir });
  new Block(app, name, opts);
  app.synth();

  const chartFilePath = path.join(outputDir, 'Chart.yaml');
  if (!fs.existsSync(chartFilePath)) {
    fs.writeFileSync(chartFilePath, yaml.stringify({
      apiVersion: 'v1',
      name: `${name}-kblock`,
      version: "1.0.0"
    }));
  }
}

function resolveSchema(props: Manifest): JsonSchemaProps {
  if (props.definition.schema) {
    return props.definition.schema;
  }

  throw new Error("No schema found");
}

/**
 * Calculate the image name for a given service.
 * 
 * @param serviceName The name of the service to calculate the image name for (e.g. `operator`, `worker`, or `control`)
 * @returns The image name.
 */
function calculateImageName(serviceName: string) {
  const imagePrefix = "wingcloudbot/kblocks-";
  const versionOverrideEnv = `KBLOCKS_VERSION`;
  const overrideEnv = `KBLOCKS_${serviceName.toUpperCase()}_IMAGE`;

  // if we have an explicit override KBLOCKS_XXX_IMAGE, then use it
  const imageOverride = process.env[overrideEnv];
  if (imageOverride) {
    console.log(`Override for ${serviceName} is ${imageOverride}`);
    return imageOverride;
  }

  // if we only have a version override, use it
  const versionOverride = process.env[versionOverrideEnv];
  if (versionOverride) {
    const image = `${imagePrefix}${serviceName}:${versionOverride}`;
    console.log(`Version override for ${serviceName} is ${image}`);
    return image;
  }

  // now, if this is a source build, we got to bail
  if (packageJson.version === "0.0.1") {
    throw new Error(`Building from source and neither '${overrideEnv}' nor '${versionOverrideEnv}' are set, please set one of them to the image you want to use (e.g. '${overrideEnv}=wingcloudbot/kblocks-${serviceName}:0.1.13' or '${versionOverrideEnv}=0.1.13')`);
  }

  return `${imagePrefix}${serviceName}:${packageJson.version}`;
}