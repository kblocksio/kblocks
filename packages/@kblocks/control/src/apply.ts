import * as k8s from "@kubernetes/client-node";
import { ApiObject } from "./api";
import { Context } from "./context";

const FIELD_MANAGER = "kblocks";

async function tryGetResource(client: k8s.CustomObjectsApi, { group, version, plural, name, namespace }: { group: string, version: string, plural: string, name: string, namespace: string }) {
  try {
    return await client.getNamespacedCustomObject(group, version, namespace, plural, name);
  } catch (error) {
    return null;
  }
}

export async function applyObject(client: k8s.CustomObjectsApi, ctx: Context, obj: ApiObject) {
  const { group, version, plural } = ctx;
  const namespace = obj?.metadata?.namespace ?? "default";
  const name = obj?.metadata?.name;

  // first, check if the resource already exists
  const existing = await tryGetResource(client, { group, version, plural, name, namespace });

  // if it does, we need to patch it
  if (existing) {
    return await client.patchNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      name,
      obj,
      undefined,
      FIELD_MANAGER,
      undefined,
      { headers: { 'Content-Type': 'application/merge-patch+json' } }
    );
  } else {
    return await client.createNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      obj,
      undefined,
      undefined,
      FIELD_MANAGER
    );
  }
}
