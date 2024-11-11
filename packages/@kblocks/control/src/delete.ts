import * as k8s from "@kubernetes/client-node";
import { isCoreGroup, parseBlockUri } from "./api";
import { Context } from "./context";
import { deleteCoreResource } from "./client";

export async function deleteObject(client: k8s.CustomObjectsApi, ctx: Context, objUri: string) {
  console.log(`DELETE: ${objUri}`);

  const { group, version, plural } = ctx;
  const { namespace, name } = parseBlockUri(objUri);

  if (!isCoreGroup(group)) {
    await client.deleteNamespacedCustomObject(group, version, namespace, plural, name);
  } else {
    await deleteCoreResource({ version, plural, name, namespace });
  }
}
