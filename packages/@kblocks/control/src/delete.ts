import * as k8s from "@kubernetes/client-node";
import { parseBlockUri } from "./api";
import { Context } from "./context";

export async function deleteObject(client: k8s.CustomObjectsApi, ctx: Context, objUri: string) {
  console.log(`DELETE: ${objUri}`);

  const { group, version, plural } = ctx;
  const { namespace, name } = parseBlockUri(objUri);

  await client.deleteNamespacedCustomObject(group, version, namespace, plural, name);
}
