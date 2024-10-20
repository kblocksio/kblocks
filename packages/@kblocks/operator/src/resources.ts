import { Manifest } from "./api";
import * as k8s from "@kubernetes/client-node";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sCoreClient = kc.makeApiClient(k8s.CoreV1Api);
const k8sCustomClient = kc.makeApiClient(k8s.CustomObjectsApi);

export async function listAllResources(manifest: Manifest) {
  const { body: namespaceList } = await k8sCoreClient.listNamespace();
  const result = [];

  for (const namespace of namespaceList.items) {
    const name = namespace.metadata?.name;
    if (!name) {
      continue;
    }

    const { body: resourceList } = await k8sCustomClient.listNamespacedCustomObject(
      manifest.definition.group,
      manifest.definition.version,
      name,
      manifest.definition.plural
    );

    for (const resource of (resourceList as any).items) {
      result.push(resource);
    }
  }

  return result;
}
