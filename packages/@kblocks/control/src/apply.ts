import * as k8s from "@kubernetes/client-node";
import { ApiObject, isCoreGroup } from "@kblocks/api";
import { Context } from "./context";
import { createCoreResource, getCoreResource, patchCoreResource } from "./client.js";

const FIELD_MANAGER = "kblocks";

async function tryGetResource(client: k8s.CustomObjectsApi, { group, version, plural, name, namespace }: { group: string, version: string, plural: string, name: string, namespace: string }) {
  try {
    if (!isCoreGroup(group)) {
      return await client.getNamespacedCustomObject(group, version, namespace, plural, name);
    } else {
      return await getCoreResource({ version, plural, name, namespace });
    }
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
    if (!isCoreGroup(group)) {
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
      return await patchCoreResource({ version, plural, name, namespace, object: obj });
    }
  } else {
    if (!isCoreGroup(group)) {
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
    } else {
      return await createCoreResource({ version, plural, name, namespace, object: obj });
    }
  }
}
