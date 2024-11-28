import { Construct } from "constructs";
import { ConfigMap } from "cdk8s-plus-30";
import * as tar from "tar";
import zlib from "zlib";
import crypto from "crypto";
import { readdirSync } from "fs";
import { relative, join } from "path";
import * as k8s from "cdk8s-plus-30";
import { displayApiVersion, formatBlockTypeForEnv } from "@kblocks/api";
import fs from "fs";
import { BlockRequest } from "./types";

export interface PodEnvironment {
  namespace: string;
  envSecrets?: Record<string, string> | Record<string, { key: string, secret: string, optional?: boolean }>;
  envConfigMaps?: Record<string, string>;
  env?: Record<string, string>;
  configMaps: Record<string, k8s.ConfigMap>;
}

export interface ConfigMapVolumeProps {
  namespace: string;
  blockRequests: BlockRequest[];
  flushOnly: boolean;
}

export class ConfigMapFromDirectory extends Construct {
  public readonly configMaps: Record<string, ConfigMap>;

  constructor(scope: Construct, id: string, props: ConfigMapVolumeProps) {
    super(scope, id);

    this.configMaps = {};

    for (const blockRequest of props.blockRequests) {
      const blockType = formatBlockTypeForEnv(blockRequest.block.definition);
      if (blockRequest.source) {
        this.configMaps[`kblock_${blockType}`] = new ConfigMap(this, `archive-${blockType}`, {
          metadata: {
            namespace: props.namespace,
          },
          data: {
            "archive.tgz": createTgzBase64(blockRequest.source),
          },
        });
      }

      this.configMaps[`kblock-${blockType}`] = new ConfigMap(this, `block-json-${blockType}`, {
        metadata: {
          namespace: props.namespace,
        },
        data: {
          "block.json": createGzipBase64(JSON.stringify(blockRequest.block)),
        },
      });
    }

    this.configMaps["kconfig"] = new ConfigMap(this, "block-json", {
      metadata: {
        namespace: props.namespace,
      },
      data: {
        "config.json": readBlockJson(props.blockRequests, props.flushOnly),
      },
    });
  }
}

export function setupPodEnvironment(pod: k8s.AbstractPod, container: k8s.Container, podEnv: PodEnvironment) {
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
      container.env.addVariable(key, k8s.EnvValue.fromSecretValue({ secret, key: value.key }, { optional: value.optional }));
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

export function createTgzBase64(srcDir: string): string {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`No ${srcDir} directory found. Please ensure that the source directory is named 'src'`);
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

function readBlockJson(blockRequests: BlockRequest[], flushOnly: boolean) {
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

export function createGzipBase64(data: string) {
  const compressed = zlib.deflateSync(data, { level: zlib.constants.Z_BEST_COMPRESSION });
  return compressed.toString("base64");
}
