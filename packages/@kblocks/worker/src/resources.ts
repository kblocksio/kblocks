import { ApiObject, isCoreGroup, parseBlockUri } from "@kblocks/api";
import * as k8s from "@kubernetes/client-node";
import { RuntimeContext } from "./host";
import { getCoreResource } from "./client.js";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sCustomClient = kc.makeApiClient(k8s.CustomObjectsApi);

export async function getCustomResource(host: RuntimeContext) {
  const { group, version, plural, namespace, name } = parseBlockUri(host.objUri);
  const obj = await k8sCustomClient.getNamespacedCustomObject(group, version, namespace, plural, name);
  return obj.body as ApiObject;
}

export async function getResource(host: RuntimeContext) {
  const { group, version, plural, namespace, name } = parseBlockUri(host.objUri);
  if (!isCoreGroup(group)) {
    return getCustomResource(host);
  } else {
    const result = await getCoreResource({ version, plural, name, namespace });
    return result as ApiObject;
  }
}
