import { ApiObject, Manifest, emitEvent } from "./api";
import * as k8s from "@kubernetes/client-node";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sCoreClient = kc.makeApiClient(k8s.CoreV1Api);
const k8sCustomClient = kc.makeApiClient(k8s.CustomObjectsApi);

export function flush(system: string, manifest: Manifest) {
  console.log("flushing resources and resource types...");
  Promise.all([
    flushType(system, manifest),
    flushAllResources(system, manifest),
  ]).then(() => {
    console.log("flushed");
  }).catch((error) => {
    console.error("Error flushing resources:", error);
    console.error("Restarting pod...");
    process.exit(1);
  });
}

async function flushAllResources(system: string, manifest: Manifest) {
  const resources = await listAllResources(manifest);

  for (const resource of resources) {
    const objType = `${manifest.definition.group}/${manifest.definition.version}/${manifest.definition.plural}`;
    flushResource(system, objType, resource);
  }
}

async function flushType(system: string, manifest: Manifest) {
  const name = `${manifest.definition.plural}.${manifest.definition.group}`;

  console.log("flushing resource type", name);
  console.log("manifest:", JSON.stringify(manifest));

  // we emulate a CRD here that represents the block (in the future it will actually be a CRD)
  const objType = `kblocks.io/v1/blocks`;

  await flushResource(system, objType, {
    apiVersion: "kblocks.io/v1",
    kind: "Block",
    metadata: { name },
    status: {
      conditions: [
        {
          type: "Ready",
          status: "True",
          reason: "Synced",
          message: "Synthetic block",
        }
      ]
    },
    spec: manifest,
  });
}

async function flushResource(system: string, objType: string, resource: ApiObject) {
  const objUri = `kblocks://${objType}/${system}/${resource.metadata.namespace ?? "default"}/${resource.metadata.name}`;

  console.log(`flushing resource: ${objUri}`);

  emitEvent({
    type: "OBJECT",
    reason: "SYNC",
    objUri,
    objType,
    object: resource,
    timestamp: new Date(),
  });
}

async function listAllResources(manifest: Manifest) {
  const { body: namespaceList } = await k8sCoreClient.listNamespace();
  const result = [];

  for (const namespace of namespaceList.items) {
    const name = namespace.metadata?.name;
    if (!name) {
      continue;
    }

    const { body: resourceList } = await k8sCustomClient.listNamespacedCustomObject(
      manifest.definition.group,
      manifest.definition.version,
      name,
      manifest.definition.plural
    );

    for (const resource of (resourceList as any).items) {
      result.push(resource);
    }
  }

  return result;
}
