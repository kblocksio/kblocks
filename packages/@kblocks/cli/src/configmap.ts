import { Construct } from "constructs";
import { ConfigMap } from "cdk8s-plus-30";
import * as tar from "tar";
import crypto from "crypto";
import { readdirSync } from "fs";
import { relative, join } from "path";
import * as k8s from "cdk8s-plus-30";
import { displayApiVersion, formatBlockTypeForEnv } from "./api/index.js";
import fs from "fs";
import { BlockRequest } from "./types";

export interface PodEnvironment {
  namespace: string;
  envSecrets?: Record<string, string> | Record<string, { key: string, secret: string }>;
  envConfigMaps?: Record<string, string>;
  env?: Record<string, string>;
  configMaps: Record<string, k8s.ConfigMap>;
}

export interface ConfigMapVolumeProps {
  namespace: string;
  blockRequests: BlockRequest[];
  flushOnly?: boolean;
}

export class ConfigMapFromDirectory extends Construct {
  public readonly configMaps: Record<string, ConfigMap>;

  constructor(scope: Construct, id: string, props: ConfigMapVolumeProps) {
    super(scope, id);

    this.configMaps = {};

    // TODO (shaib): copy the source directory to a temporary location
    // override the file under `values.schema.json` with the materialized schema
    // which should be available `props.block.definition.schema`.

    for (const blockRequest of props.blockRequests) {
      if (blockRequest.source) {
        const blockType = formatBlockTypeForEnv(blockRequest.block.definition);
        this.configMaps[`kblock_${blockType}`] = new ConfigMap(this, `archive-${blockType}`, {
          metadata: {
            namespace: props.namespace,
          },
          data: {
            "archive.tgz": createTgzBase64(blockRequest.source),
          },
        });
      }
    }

    this.configMaps["kconfig"] = new ConfigMap(this, "block-json", {
      metadata: {
        namespace: props.namespace,
      },
      data: {
        "kblock.json": readBlockJson(props.blockRequests, props.flushOnly),
      },
    });
  }
}

export function setupPodEnvironment(pod: k8s.AbstractPod, container: k8s.Container, podEnvs: PodEnvironment[]) {
  const podEnv = podEnvs.reduce((acc, curr) => {
    return {
      namespace: curr.namespace,
      configMaps: {
        ...acc.configMaps,
        ...curr.configMaps,
      },
      envSecrets: {
        ...acc.envSecrets,
        ...curr.envSecrets,
      },
      envConfigMaps: {
        ...acc.envConfigMaps,
        ...curr.envConfigMaps,
      },
      env: {
        ...acc.env,
        ...curr.env,
      },
    }
  });

  for (const [key, value] of Object.entries(podEnv.configMaps)) {
    const volume = k8s.Volume.fromConfigMap(pod, `ConfigMapVolume-${key}`, value);
    pod.addVolume(volume);
    pod.metadata.addLabel(`configmap-hash-${key}`, createHashFromConfigMap(value));
    pod.podMetadata.addLabel(`configmap-hash-${key}`, createHashFromConfigMap(value));
    container.mounts.push({
      volume,
      path: `/${key}`,
    });
  }

  for (const [key, value] of Object.entries(podEnv.envSecrets ?? {})) {
    if (typeof value === "string") {
      const secret = k8s.Secret.fromSecretName(pod, `credentials-${key}-${value}`, value);
      container.env.addVariable(key, k8s.EnvValue.fromSecretValue({ secret, key }));
    } else {
      const secret = k8s.Secret.fromSecretName(pod, `credentials-${key}-${value.secret}`, value.secret);
      container.env.addVariable(key, k8s.EnvValue.fromSecretValue({ secret, key: value.key }));
    }
  }

  for (const [key, value] of Object.entries(podEnv.envConfigMaps ?? {})) {
    const cm = k8s.ConfigMap.fromConfigMapName(pod, `configmaps-${key}-${value}`, value);
    container.env.addVariable(key, k8s.EnvValue.fromConfigMap(cm, key));
  }

  for (const [key, value] of Object.entries(podEnv.env ?? {})) {
    container.env.addVariable(key, k8s.EnvValue.fromValue(value));
  }
}

export function createTgzBase64(rootDir: string): string {
  const srcDir = join(rootDir, "src");
  if (!fs.existsSync(srcDir)) {
    throw new Error("No 'src' directory found in the provided directory. Please ensure that the source directory is named 'src'.");
  }

  const excludedFolders = ["node_modules", ".git", "target", ".DS_Store"];
  
  const getAllFiles = (dir: string): string[] => {
    const files = readdirSync(dir, { withFileTypes: true });
    const paths: string[] = [];
    
    for (const file of files) {
      if (excludedFolders.includes(file.name)) continue;
      
      const fullPath = join(dir, file.name);
      if (file.isDirectory()) {
        paths.push(...getAllFiles(fullPath));
      } else {
        paths.push(fullPath);
      }
    }
    
    return paths.sort(); // Sort the paths for deterministic order
  };
  
  const filesToArchive = getAllFiles(srcDir);

  const tarStream = tar.create(
    {
      gzip: true,
      sync: true,
      noMtime: true,
      cwd: srcDir,
      portable: true,
      follow: true,
      filter: (_, stat) => {
        stat.mtime = undefined;
        stat.atime = undefined;
        stat.ctime = undefined;
        return true;
      }
    },
    filesToArchive.map(file => relative(srcDir, file))
  );
  
  const data = tarStream.read();
  if (!data) {
    throw new Error("Failed to read tar stream");
  }

  return data.toString("base64");
}

export function readBlockJson(blockRequests: BlockRequest[], flushOnly?: boolean) {
  const blocks = blockRequests.map( b => ({
    manifest: b.block,
    engine: b.block.engine,
  }));

  const kubernetes = blockRequests.map( b => ({
    apiVersion: displayApiVersion(b.block),
    kind: b.block.definition.kind,
    executeHookOnEvent: ["Added", "Modified", "Deleted"]
  }));

  const schedule = [];
  if (flushOnly) {
    schedule.push({
      name: "flush",
      crontab: "0,30 * * * * *",
      allowFailure: false,
    });
  } else {
    schedule.push({
      name: "read",
      crontab: "* * * * *",
      allowFailure: true,
    });
  }

  return JSON.stringify({
    blocks,
    flushOnly: flushOnly,
    config: {
      configVersion: "v1",
      schedule: schedule,
      kubernetes: kubernetes,
    }
  });
}

export function createHashFromConfigMap(configMap: ConfigMap) {
  const data = configMap.data;
  const binaryData = configMap.binaryData;

  const combinedData = { ...data, ...binaryData };

  const sortedKeys = Object.keys(combinedData).sort();
  const sortedValues = sortedKeys.map(key => combinedData[key]);

  const sortedData = sortedValues.join("\n");
  return crypto.createHash("sha256").update(sortedData).digest("hex").substring(0, 62);
}
