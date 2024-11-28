import path from "path";
import fs from "fs";
import { App, Chart } from "cdk8s";
import { Operator } from "./operator";
import { Worker } from "./worker";
import { CustomResourceDefinition } from "./crd";
import { JsonSchemaProps } from "../imports/k8s";
import { ConfigMapFromDirectory } from "./configmap";
import packageJson from "../package.json";
import { Control } from "./control";
import { formatBlockTypeForEnv, IncludeManifest, Manifest } from "@kblocks/api";
import { Construct } from "constructs";
import yaml from 'yaml';
import { getManifest, renderStatusSchema } from "./manifest-util";
import { BlockRequest } from "./types";
import cloneDeep from "lodash.clonedeep";

export const buildCommand = async (opts: {
  DIR?: string;
  manifest: string;
  output: string;
  env: Record<string, string>;
}) => {
  const { blockRequests, outdir, names } = await build({
    ...opts,
    dir: opts.DIR ?? process.cwd(),
  });

  console.log();
  console.log("-------------------------------------------------------------------------------------------------------------------");
  for (const request of blockRequests) {
    console.log(`Block '${request.block.definition.group}.${request.block.definition.kind}' is ready. To install:`);
  }
  console.log();
  console.log(`  helm upgrade --install ${names}-block ${outdir}`);
  console.log();
};

export async function build(opts: {
  manifest: string;
  dir: string;
  output: string;
  silent?: boolean;
  env: Record<string, string>;
}) {
  const outdir = path.resolve(process.cwd(),opts.output);

  // create the output directory and clean it up if it already exists
  fs.rmSync(outdir, { recursive: true, force: true });
  fs.mkdirSync(outdir, { recursive: true });

  const dir = path.resolve(process.cwd(), opts.dir);
  const { manifest, additionalObjects, tmpSrc } = await getManifest({
    dir: path.resolve(process.cwd(), opts.dir),
    manifest: opts.manifest,
    outdir
  });

  // Check if Chart.yaml exists in the manifest directory
  const chartPath = path.join(dir, 'Chart.yaml');
  if (fs.existsSync(chartPath)) {
    fs.copyFileSync(chartPath, path.join(outdir, 'Chart.yaml'));
  }

  const blockRequests: BlockRequest[] = [];
  const moreObjects: any[] = [...additionalObjects];
  for (const include of manifest.include ?? []) {
    const includePath = path.resolve(dir, include);
    const included = await getManifest({
      dir: path.dirname(includePath),
      manifest: path.basename(includePath),
      outdir
    });

    blockRequests.push({
      block: included.manifest,
      source: included.tmpSrc,
    });
    moreObjects.push(...included.additionalObjects);
  }

  const names = synth({
    mainBlock: { block: manifest, source: tmpSrc },
    included: blockRequests,
    output: outdir,
    env: opts.env,
  });

  // write any additional objects to the templates directory
  if (moreObjects.length > 0) {
    const additionalObjectsManifest = path.join(outdir, "templates", "additional-objects.yaml");
    fs.writeFileSync(additionalObjectsManifest, yaml.stringify(moreObjects));
  }

  return { outdir, names, blockRequests };
}

export interface BlockProps {
  env: Record<string, string>;
  blockRequests: BlockRequest[];
}

interface SynthProps {
  mainBlock: BlockRequest;
  included: BlockRequest[];
  env: Record<string, string>;
  output: string;
  force?: boolean;
}

export class Block extends Chart {
  constructor(scope: Construct, id: string, props: BlockProps) {
    super(scope, id);

    const { env } = props;

    // make a deep copy of the block requests so we can modify them
    const blockRequests: BlockRequest[] = cloneDeep(props.blockRequests);

    if (blockRequests.length === 0) {
      throw new Error("No block requests provided");
    }

    // add the "status" schema to the all blocks
    for (const req of blockRequests) {
      req.block.definition.schema.properties = req.block.definition.schema.properties ?? {};
      req.block.definition.schema.properties.status = renderStatusSchema(req.block);
    }

    const mainBlock = blockRequests[0];
    const namespace = mainBlock.block.operator?.namespace ?? "{{ .Release.Namespace }}";
    const workers = mainBlock.block.operator?.workers ?? 1;
    const flushOnly = mainBlock.block.operator?.flushOnly ?? false;

    addSystemIfNotSet(mainBlock.block);

    const configmap = new ConfigMapFromDirectory(this, "ConfigMapVolume", {
      blockRequests,
      namespace,
      flushOnly,
    });
  
    const redisServiceName = `${id}-redis`;

    const image = {
      operator: calculateImageName("operator"),
      worker: calculateImageName("worker"),
      control: calculateImageName("control"),
    };

    const pod = {
      namespace,
      configMaps: configmap.configMaps,
      ...mainBlock.block.operator,
      env: {
        REDIS_URL: `redis://${redisServiceName}.${namespace}.svc.cluster.local:${6379}`,
        // this can be used to spawn new blocks (e.g. by the `Block` block).
        KBLOCKS_WORKER_IMAGE: image.worker,
        KBLOCKS_OPERATOR_IMAGE: image.operator,
        KBLOCKS_CONTROL_IMAGE: image.control,
        ...mainBlock.block.operator?.env,
        ...env,
      }
    }
    const blocks = blockRequests.map(b => ({
      ...b.block.definition,
    }));
  
    new Operator(this, "Operator", {
      names: id,
      namespace,
      image: image.operator,
      redisServiceName,
      workers,
      blocks,
      pod,
    });
  
    if (!flushOnly) {
      new Worker(this, "Worker", {
        names: id,
        namespace,
        image: image.worker,
        replicas: workers,
        blocks,
        pod,
      });
    }
  
    new Control(this, "Control", {
      names: id,
      namespace,
      image: image.control,
      workers,
      blocks,
      pod,
    });

    if (!mainBlock.block.operator?.skipCrd) {
      for (const blockRequest of blockRequests) {
        const annotations: Record<string, string> = {
          "kblocks.io/metadata-namespace": namespace,
        };
      
        if (blockRequest.block.definition.icon) {
          annotations["kblocks.io/icon"] = blockRequest.block.definition.icon;
        }
      
        if (blockRequest.block.definition.color) {
          annotations["kblocks.io/color"] = blockRequest.block.definition.color;
        }
    
        const blockType = formatBlockTypeForEnv(blockRequest.block.definition);

        new CustomResourceDefinition(this, `CRD-${blockType}`, {
          ...blockRequest.block.definition,
          annotations,
          schema: blockRequest.block.definition.schema,
        });
      }
    }
  }
}

export function synth(opts: SynthProps) {
  const { blockRequests } = validateBlockRequests(opts.mainBlock, opts.included);
  const names = calculateNames(blockRequests);
  const outputDir = path.resolve(opts.output);
  
  const templatesdir = path.join(outputDir, "templates");
  fs.mkdirSync(templatesdir, { recursive: true });

  const app = new App({ outdir: templatesdir });

  new Block(app, names, {
    ...opts,
    blockRequests,
  });

  app.synth();

  const chartFilePath = path.join(outputDir, 'Chart.yaml');
  if (!fs.existsSync(chartFilePath)) {
    fs.writeFileSync(chartFilePath, yaml.stringify({
      apiVersion: 'v1',
      name: `${names}-kblock`,
      version: "1.0.0"
    }));
  }

  return names;
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
  function setEnv(key: string, optional: boolean) {
    block.operator = block.operator ?? {};
    // check if one of the "env" is KBLOCKS_API_KEY
    if (key in (block.operator.env ?? {}) ||
        key in (block.operator.envSecrets ?? {}) ||
        key in (block.operator.envConfigMaps ?? {})) {
      return;
    }
  
    block.operator.envSecrets = block.operator.envSecrets ?? {};
    block.operator.envSecrets[key] = {
      key: key,
      secret: "kblocks",
      optional: optional,
    };
  }

  const keys = ["KBLOCKS_SYSTEM_ID", "KBLOCKS_API_KEY", "KBLOCKS_PUBSUB_HOST"];
  for (const key of keys) {
    setEnv(key, false);
  }

  const optionalKeys = ["KBLOCKS_PUBSUB_PORT", "KBLOCKS_STORAGE_PREFIX"];
  for (const key of optionalKeys) {
    setEnv(key, true);
  }
}

export function calculateNames(blockRequests: BlockRequest[]) {
  if (blockRequests.length === 0) {
    throw new Error("No block requests provided");
  }

  const names = [];
  for (const { block } of blockRequests) {
    names.push(block.definition.kind.toLocaleLowerCase());
  }

  return names.join("-");
}

function validateManifest(block: Manifest) {
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

function validateBlockRequests(mainBlock: BlockRequest, included: BlockRequest[]) {
  if (included.length > 0) {
    const allowdProps = ["include", "operator"];
    for (const key of Object.keys(mainBlock.block)) {
      if (!allowdProps.includes(key)) {
        throw new Error(`Invalid property '${key}' in main block manifest`);
      }
    }

    IncludeManifest.parse(mainBlock.block);

    for (const { block } of included) {
      validateManifest(block);

      if (block.operator) {
        throw new Error("Included blocks cannot have an operator section");
      }
    }

    return {
      blockRequests: included.map(b => ({
        block: {
          ...b.block,
          operator: mainBlock.block.operator,
        },
        source: b.source,
      })),
    }
  } else {
    validateManifest(mainBlock.block);
    return {
      blockRequests: [mainBlock],
    }
  }
}
