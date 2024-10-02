import * as k8s from "@kubernetes/client-node";
import { type ErrorEvent, emitEvent, formatBlockType, parseBlockUri } from "./api";
import { Context } from "./context";

export async function deleteObject(client: k8s.CustomObjectsApi, ctx: Context, objUri: string) {
  const { group, version, plural, system: systemId } = ctx;
  const blockUri = parseBlockUri(objUri);
  const blockType = formatBlockType(blockUri);

  try {
    await client.deleteNamespacedCustomObject(group, version, blockUri.namespace, plural, blockUri.name);
  } catch (error: any) {
    const msg = (error.body as any)?.message ?? "unknown error";
    const message = `Error deleting object ${objUri}: ${msg}`;
    console.error(message);
    emitEvent({
      type: "ERROR",
      objType: blockType,
      objUri,
      message,
    } as ErrorEvent);
  }
}
