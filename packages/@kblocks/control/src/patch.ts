import * as k8s from "@kubernetes/client-node";
import { type ErrorEvent, blockTypeFromUri, emitEvent, parseBlockUri } from "./api";
import { Context } from "./context";

const FIELD_MANAGER = "kblocks";

export async function patchObject(client: k8s.CustomObjectsApi, ctx: Context, objUri: string, obj: Record<string, any>) {
  const { group, version, plural } = ctx;
  const blockUri = parseBlockUri(objUri);
  const { namespace, name } = blockUri;

  try {
    console.log(`PATCH: ${objUri}: ${JSON.stringify(obj)}`);
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
  } catch (error: any) {
    const msg = (error.body as any)?.message ?? "unknown error";
    const message = `Error creating object ${objUri}: ${msg}`;
    console.error(message, obj);
    emitEvent({
      type: "ERROR",
      objType: blockTypeFromUri(objUri),
      objUri,
      message,
      body: obj,
    } as ErrorEvent);
  }
}
