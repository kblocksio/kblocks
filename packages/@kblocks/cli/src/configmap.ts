import { Construct } from "constructs";
import { ConfigMap } from "cdk8s-plus-30";
import * as tar from "tar";
import crypto from "crypto";
import { readdirSync } from "fs";
import { relative, join } from "path";
import { readManifest } from "./types";

export interface ConfigMapVolumeProps {
  namespace?: string;
  path: string;
  archive: string;
}

export class ConfigMapFromDirectory extends Construct {
  public readonly configMaps: Record<string, ConfigMap>;

  constructor(scope: Construct, id: string, props: ConfigMapVolumeProps) {
    super(scope, id);

    this.configMaps = {};
    this.configMaps["kblock"] = new ConfigMap(this, "archive-tgz", {
      metadata: {
        namespace: props.namespace,
      },
      data: {
        "archive.tgz": props.archive,
      },
    });
    this.configMaps["kconfig"] = new ConfigMap(this, "block-json", {
      metadata: {
        namespace: props.namespace,
      },
      data: {
        "kblock.json": readBlockJson(props.path),
      },
    });
  }
}

export async function createTgzBase64(directory: string): Promise<string> {
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
      sync: false,
      noMtime: true,
      cwd: directory,
      portable: true,
      filter: (_, stat) => {
        stat.mtime = undefined;
        stat.atime = undefined;
        stat.ctime = undefined;
        return true;
      }
    }, 
    filesToArchive.map(file => relative(directory, file))
  );
  
  const chunks: Buffer[] = [];
  
  return new Promise<string>((resolve, reject) => {
    tarStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    tarStream.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
    tarStream.on("error", reject);
  });
}

export function readBlockJson(directory: string) {
  const block = readManifest(directory);
  return JSON.stringify({
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
