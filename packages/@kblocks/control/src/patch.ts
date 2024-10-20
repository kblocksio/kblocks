import * as k8s from "@kubernetes/client-node";
import { parseBlockUri } from "./api";
import { Context } from "./context";

const FIELD_MANAGER = "kblocks";

export async function patchObject(client: k8s.CustomObjectsApi, ctx: Context, objUri: string, obj: Record<string, any>) {
  console.log(`PATCH: ${objUri}: ${JSON.stringify(obj)}`);

  const { group, version, plural } = ctx;
  const { namespace, name } = parseBlockUri(objUri);

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
}
