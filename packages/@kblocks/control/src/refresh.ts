import * as k8s from "@kubernetes/client-node";
import { ObjectEvent, blockTypeFromUri, emitEvent, parseBlockUri } from "./api";
import { Context } from "./context";

export async function refreshObject(client: k8s.CustomObjectsApi, ctx: Context, objUri: string) {
  console.log(`REFRESH: ${objUri}`);

  const { group, version, plural } = ctx;
  const { namespace, name } = parseBlockUri(objUri);

  const obj = await client.getNamespacedCustomObject(group, version, namespace, plural, name);
  return emitEvent({
    type: "OBJECT",
    objType: blockTypeFromUri(objUri),
    objUri,
    object: obj.body,
  } as ObjectEvent);
}
