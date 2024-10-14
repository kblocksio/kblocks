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
import { readManifest, resolveExternalAssets } from "./manifest-util";
import { chdir } from "./util";

export const buildCommand = async (opts: {
  DIR?: string;
  manifest: string;
  output: string;
}) => {
  return chdir(opts.DIR, async () => {
    const { manifest, outdir } = await build(opts);

    console.log();
    console.log("-------------------------------------------------------------------------------------------------------------------");
    console.log(`Block '${manifest.definition.group}/${manifest.definition.version}.${manifest.definition.kind}' is ready. To install:`);
    console.log();
    console.log(`  helm upgrade --install ${manifest.definition.kind.toLowerCase()}-block ${outdir}`);
    console.log();
  });
};

export async function build(opts: {
  manifest: string;
  output: string;
  silent?: boolean;
}) {
  const manifestPath = path.resolve(opts.manifest);
  const outdir = path.resolve(opts.output);

  // read the manifest file and extract the block manifest
  var { blockObject, additionalObjects } = readManifest(manifestPath);
  if (!blockObject) {
    throw new Error(`Unable to find a kblocks.io/v1 Block object in ${manifestPath}`);
  }

  const manifest: Manifest = await resolveExternalAssets(blockObject.spec);

  // create the output directory
  fs.mkdirSync(outdir, { recursive: true });

  // Check if Chart.yaml exists in the manifest directory
  const manifestDir = path.dirname(manifestPath);
  const chartPath = path.join(manifestDir, 'Chart.yaml');
  if (fs.existsSync(chartPath)) {
    fs.copyFileSync(chartPath, path.join(outdir, 'Chart.yaml'));
  }

  synth({ block: manifest, source: process.cwd(), output: outdir });

  // write any additional objects to the templates directory
  if (additionalObjects.length > 0) {
    const additionalObjectsManifest = path.join(outdir, "templates", "additional-objects.yaml");
    fs.writeFileSync(additionalObjectsManifest, yaml.stringify(additionalObjects));
  }

  return { outdir, manifest };
}

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

    this.validateManifest(block);

    const namespace = block.operator?.namespace ?? "{{ .Release.Namespace }}";
    const workers = block.operator?.workers ?? 1;

    addSystemIfNotSet(block);

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
      namespace,
      ...block.operator,
      ...block.definition
    });
  
    new Worker(this, "Worker", {
      image: image.worker,
      configMaps: configmap.configMaps,
      ...block.operator,
      ...block.definition,
      replicas: workers,
      namespace,
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
      namespace,
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

  private validateManifest(block: Manifest) {
    try {
      Manifest.parse(block);

      if (block.source?.directory && !block.source.directory.endsWith("/src")) {
        throw new Error(`Source directory must end with '/src'. got: ${block.source.directory}`);
      }

    } catch (err: any) {
      if (typeof(err["format"]) === "function") {
        throw new Error(`Invalid block manifest: ${JSON.stringify(err.format(), null, 2)}`);
      }

      throw err;
    }
  }
}

export function synth(opts: Options) {
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
  if (!props.definition.schema) {
    throw new Error("No schema found in kblock manifest. Please define the OpenAPIV3 schema under the 'schema' field of the 'definition' section of the manifest.");
  }

  return props.definition.schema;
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
    return image;
  }

  // now, if this is a source build, we got to bail
  if (packageJson.version === "0.0.1") {
    throw new Error(`Building from source and neither '${overrideEnv}' nor '${versionOverrideEnv}' are set, please set one of them to the image you want to use (e.g. '${overrideEnv}=wingcloudbot/kblocks-${serviceName}:0.1.13' or '${versionOverrideEnv}=0.1.13')`);
  }

  return `${imagePrefix}${serviceName}:${packageJson.version}`;
}

function addSystemIfNotSet(block: Manifest) {
  const key = "KBLOCKS_SYSTEM_ID";
  block.operator = block.operator ?? {};

  // check if one of the "env" is KBLOCKS_SYSTEM_ID
  if (key in (block.operator.env ?? {}) ||
      key in (block.operator.envSecrets ?? {}) ||
      key in (block.operator.envConfigMaps ?? {})) {
    return;
  }

  // if KBLOCKS_SYSTEM_ID is not set, read it from the "kblocks-system" ConfigMap by default.
  block.operator.envConfigMaps = block.operator.envConfigMaps ?? {};
  block.operator.envConfigMaps[key] = "kblocks-system";
}
