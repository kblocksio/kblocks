import * as k8s from "@kubernetes/client-node";
import { ApiObject, type ErrorEvent, blockTypeFromUri, emitEvent } from "./api";
import { Context } from "./context";
import { formatBlockUri } from "./api";

const FIELD_MANAGER = "kblocks";

async function tryGetResource(client: k8s.CustomObjectsApi, { group, version, plural, name, namespace }: { group: string, version: string, plural: string, name: string, namespace: string }) {
  try {
    return await client.getNamespacedCustomObject(group, version, namespace, plural, name);
  } catch (error) {
    return null;
  }
}

export async function applyObject(client: k8s.CustomObjectsApi, ctx: Context, obj: ApiObject) {
  const { group, version, plural, system } = ctx;
  const namespace = obj?.metadata?.namespace ?? "default";
  const name = obj?.metadata?.name;

  const blockUri = formatBlockUri({ group, system, name, namespace, plural, version });

  try {
    // first, check if the resource already exists
    const existing = await tryGetResource(client, { group, version, plural, name, namespace });

    // if it does, we need to patch it
    if (existing) {
      console.log(`PATCH: ${blockUri}: ${JSON.stringify(obj)}`);
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
      console.log(`CREATE: ${blockUri}: ${JSON.stringify(obj)}`);
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
  } catch (error: any) {
    const msg = (error.body as any)?.message ?? "unknown error";
    const message = `Error creating object ${blockUri}: ${msg}`;
    console.error(message, obj);
    emitEvent({
      type: "ERROR",
      objType: blockTypeFromUri(blockUri),
      objUri: blockUri,
      message,
      body: obj,
    } as ErrorEvent);
  }
}
