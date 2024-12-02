import { ApiObject, EventAction, Manifest, blockTypeFromUri, isCoreGroup, formatBlockUri } from "@kblocks/api";
import { emitEvent, emitEventAsync } from "@kblocks/common";
import * as k8s from "@kubernetes/client-node";
import { Context } from "./context";
import { listAllCoreResources } from "./client";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sCoreClient = kc.makeApiClient(k8s.CoreV1Api);
const k8sCustomClient = kc.makeApiClient(k8s.CustomObjectsApi);

export function flush(ctx: Context, manifest: Manifest) {
  console.log("flushing resources and resource types...");
  Promise.all([
    flushType(ctx, manifest),
    flushAllResources(ctx, manifest),
  ]).then(() => {
    console.log("flushed");
  }).catch((error) => {
    console.error("Error flushing resources:", error);
    console.error("Restarting pod...");
    process.exit(1);
  });
}

async function flushAllResources(ctx: Context, manifest: Manifest) {
  let resources = [];
  if (!isCoreGroup(manifest.definition.group)) {
    resources = await listAllResources(manifest);
  } else {
    resources = await listAllCoreResources(manifest);
  }

  for (const resource of resources) {
    const objType = `${manifest.definition.group}/${manifest.definition.version}/${manifest.definition.plural}`;
    flushResource(ctx, objType, resource);
  }
}

async function flushType(ctx: Context, manifest: Manifest) {
  const name = `${manifest.definition.plural}.${manifest.definition.group}`;

  console.log("flushing resource type", name);
  console.log("manifest:", JSON.stringify(manifest));

  // we emulate a CRD here that represents the block (in the future it will actually be a CRD)
  const objType = `kblocks.io/v1/blocks`;

  await flushResource(ctx, objType, {
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

export async function unflushResource(ctx: Context, block: Manifest, resource: ApiObject) {
  const objType = `${block.definition.group}/${block.definition.version}/${block.definition.plural}`;
  const objUri = formatBlockUri({
    group: block.definition.group,
    version: block.definition.version,
    plural: block.definition.plural,
    system: ctx.system,
    namespace: resource.metadata.namespace ?? "default",
    name: resource.metadata.name,
  });

  console.log(`unflushing resource: ${objUri}`);
  return emitEventAsync({
    type: "OBJECT",
    object: {},
    reason: EventAction.Delete,
    objUri,
    objType,
    timestamp: new Date(),
    requestId: ctx.requestId,
  });
}

export async function unflushType(ctx: Context, block: Manifest) {
  const name = `${block.definition.plural}.${block.definition.group}`;
  console.log(`Handling cleanup for system ${ctx.system} and block ${name}`);

  let resources = [];
  if (!isCoreGroup(block.definition.group)) {
    resources = await listAllResources(block);
  } else {
    resources = await listAllCoreResources(block);
  }

  await Promise.all(resources.map(resource => unflushResource(ctx, block, resource)));
  const objUri = formatBlockUri({
    group: "kblocks.io",
    version: "v1",
    plural: "blocks",
    system: ctx.system,
    namespace: "default",
    name: name,
  });
  const objType = blockTypeFromUri(objUri);

  await emitEventAsync({
    type: "OBJECT",
    object: {},
    reason: EventAction.Delete,
    objUri,
    objType,
    timestamp: new Date(),
    requestId: ctx.requestId,
  });
}

async function flushResource(ctx: Context, objType: string, resource: ApiObject) {
  const objUri = `kblocks://${objType}/${ctx.system}/${resource.metadata.namespace ?? "default"}/${resource.metadata.name}`;

  console.log(`flushing resource: ${objUri}`);

  emitEvent({
    type: "OBJECT",
    reason: "SYNC",
    objUri,
    objType,
    object: resource,
    timestamp: new Date(),
    requestId: ctx.requestId,
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
      result.push({
        ...resource,
        apiVersion: `${manifest.definition.group}/${manifest.definition.version}`,
        kind: manifest.definition.kind,
      });
    }
  }

  return result;
}
