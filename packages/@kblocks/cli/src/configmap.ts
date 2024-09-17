import { Construct } from "constructs";
import { ConfigMap } from "cdk8s-plus-30";
import * as tar from "tar";
import { readManifest } from "./types";

export interface ConfigMapVolumeProps {
  namespace: string;
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

// export function createConfigMapFromDirectory(directory: string): Record<string, string> {
//   const configMapData: Record<string, string> = {};

//   function readDirectoryRecursively(currentPath: string, relativePath: string = '') {
//     const files = fs.readdirSync(currentPath);

//     for (const file of files) {
//       if (file === "node_modules" || file === ".DS_Store") {
//         continue;
//       }

//       const filePath = path.join(currentPath, file);
//       const stats = fs.statSync(filePath);

//       if (stats.isDirectory()) {
//         readDirectoryRecursively(filePath, path.join(relativePath, file));
//       } else {
//         const content = fs.readFileSync(filePath, 'utf8');
//         const configMapKey = path.join(relativePath, file);
//         configMapData[configMapKey] = content;
//       }
//     }
//   }

//   readDirectoryRecursively(directory);



//   return configMapData;
// }

export async function createTgzBase64(directory: string): Promise<string> {
  const excludedFolders = ["node_modules", ".git", "target", ".DS_Store"];
  
  const tarStream = tar.create(
    { 
      gzip: true, 
      cwd: directory,
      filter: (path) => !excludedFolders.some(folder => path.startsWith(folder))
    }, 
    ['.']
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
