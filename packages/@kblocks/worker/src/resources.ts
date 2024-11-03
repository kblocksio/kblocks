import { ApiObject, parseBlockUri } from "./api/index.js";
import * as k8s from "@kubernetes/client-node";
import { RuntimeContext } from "./host";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sCustomClient = kc.makeApiClient(k8s.CustomObjectsApi);

export async function getResource(host: RuntimeContext) {
  const { group, version, plural, namespace, name } = parseBlockUri(host.objUri);
  const obj = await k8sCustomClient.getNamespacedCustomObject(group, version, namespace, plural, name);
  return obj.body as ApiObject;
}
