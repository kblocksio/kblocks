import * as k8s from "@kubernetes/client-node";
import { blockTypeFromUri, isCoreGroup, parseBlockUri } from "@kblocks/api";
import { emitEvent } from "@kblocks/common";
import { Context } from "./context";
import { getCoreResource } from "./client";

export async function refreshObject(client: k8s.CustomObjectsApi, ctx: Context, objUri: string) {
  console.log(`REFRESH: ${objUri}`);

  const { group, version, plural } = ctx;
  const { namespace, name } = parseBlockUri(objUri);

  let obj;
  if (!isCoreGroup(group)) {
    const res = await client.getNamespacedCustomObject(group, version, namespace, plural, name);
    obj = res.body;
  } else {
    obj = await getCoreResource({
      ...ctx,
      name,
      namespace,
    });
  }

  return emitEvent({
    type: "OBJECT",
    objType: blockTypeFromUri(objUri),
    objUri,
    object: obj as any,
    reason: "SYNC",
    timestamp: new Date(),
    requestId: ctx.requestId,
  });
}
