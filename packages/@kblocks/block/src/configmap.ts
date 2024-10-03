import { Construct } from "constructs";
import { ConfigMap } from "cdk8s-plus-30";
import * as tar from "tar";
import crypto from "crypto";
import { readdirSync } from "fs";
import { relative, join } from "path";
import * as k8s from "cdk8s-plus-30";
import { Manifest } from "./api";

export interface PodEnvironment {
  envSecrets?: Record<string, string>;
  envConfigMaps?: Record<string, string>;
  env?: Record<string, string>;
  configMaps: Record<string, k8s.ConfigMap>;
}

export interface ConfigMapVolumeProps {
  namespace: string;
  block: Manifest;
  source?: string;
}

export class ConfigMapFromDirectory extends Construct {
  public readonly configMaps: Record<string, ConfigMap>;

  constructor(scope: Construct, id: string, props: ConfigMapVolumeProps) {
    super(scope, id);

    this.configMaps = {};
    if (props.source) {
      this.configMaps["kblock"] = new ConfigMap(this, "archive-tgz", {
        metadata: {
          namespace: props.namespace,
        },
        data: {
          "archive.tgz": createTgzBase64(props.source),
        },
      });
    }
    this.configMaps["kconfig"] = new ConfigMap(this, "block-json", {
      metadata: {
        namespace: props.namespace,
      },
      data: {
        "kblock.json": readBlockJson(props.block),
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
    const secret = k8s.Secret.fromSecretName(pod, `credentials-${key}-${value}`, value);
    container.env.addVariable(key, k8s.EnvValue.fromSecretValue({ secret, key }));
  }

  for (const [key, value] of Object.entries(podEnv.envConfigMaps ?? {})) {
    const cm = k8s.ConfigMap.fromConfigMapName(pod, `configmaps-${key}-${value}`, value);
    container.env.addVariable(key, k8s.EnvValue.fromConfigMap(cm, key));
  }

  for (const [key, value] of Object.entries(podEnv.env ?? {})) {
    container.env.addVariable(key, k8s.EnvValue.fromValue(value));
  }
}

export function createTgzBase64(directory: string): string {
  const excludedFolders = ["node_modules", ".git", "target", ".DS_Store"];
  
  const getAllFiles = (dir: string): string[] => {
    const files = readdirSync(dir, { withFileTypes: true });
    let paths: string[] = [];
    
    for (const file of files) {
      if (excludedFolders.includes(file.name)) continue;
      
      const fullPath = join(dir, file.name);
      if (file.isDirectory()) {
        paths = paths.concat(getAllFiles(fullPath));
      } else {
        paths.push(fullPath);
      }
    }
    
    return paths.sort(); // Sort the paths for deterministic order
  };
  
  const filesToArchive = getAllFiles(directory);

  const tarStream = tar.create(
    {
      gzip: true,
      sync: true,
      noMtime: true,
      cwd: directory,
      portable: true,
      follow: true,
      filter: (_, stat) => {
        stat.mtime = undefined;
        stat.atime = undefined;
        stat.ctime = undefined;
        return true;
      }
    },
    filesToArchive.map(file => relative(directory, file))
  );
  
  const data = tarStream.read();
  if (!data) {
    throw new Error("Failed to read tar stream");
  }

  return data.toString("base64");
}

export function readBlockJson(block: Manifest) {
  return JSON.stringify({
    manifest: block,
    engine: block.engine,
    config: {
      configVersion: "v1",
      kubernetes: [
        {
          apiVersion: `${block.definition.group}/${block.definition.version}`,
          kind: block.definition.kind,
          executeHookOnEvent: ["Added", "Modified", "Deleted"]
        }
      ]
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
