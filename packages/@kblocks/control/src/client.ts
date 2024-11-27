import * as k8s from '@kubernetes/client-node';
import { fetch, Agent } from 'undici';
import { ApiObject, Manifest, systemApiVersionFromComponents } from '@kblocks/api';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

export async function getCoreResource({ version, plural, name, namespace }: 
  { version: string, plural: string, name: string, namespace: string }) {
  const res: ApiObject = await rawRequest(`api/${version}/namespaces/${namespace}/${plural}/${name}`) as ApiObject;
  return {
    ...res,
    apiVersion: systemApiVersionFromComponents({ version }),
  }
}

export async function createCoreResource({ version, plural, name, namespace, object }: 
  { version: string, plural: string, name: string, namespace: string, object: object }) {
  return await rawRequest(`api/${version}/namespaces/${namespace}/${plural}`, "POST", JSON.stringify(object), {
    "Content-Type": "application/json",
  });
}

export async function patchCoreResource({ version, plural, name, namespace, object }: 
  { version: string, plural: string, name: string, namespace: string, object: object }) {
  return await rawRequest(`api/${version}/namespaces/${namespace}/${plural}/${name}`, "PATCH", JSON.stringify(object), {
    "Content-Type": "application/merge-patch+json",
  });
}

export async function deleteCoreResource({ version, plural, name, namespace }: 
  { version: string, plural: string, name: string, namespace: string }) {
  return await rawRequest(`api/${version}/namespaces/${namespace}/${plural}/${name}`, "DELETE");
}


export async function listAllCoreResources(manifest: Manifest) {
  const k8sCoreClient = kc.makeApiClient(k8s.CoreV1Api);
  const { body: namespaceList } = await k8sCoreClient.listNamespace();
  const result = [];

  for (const namespace of namespaceList.items) {
    const name = namespace.metadata?.name;
    if (!name) {
      continue;
    }

    const resourceList = await rawRequest(`api/${manifest.definition.version}/namespaces/${name}/${manifest.definition.plural}`);
    for (const resource of (resourceList as any).items) {
      result.push({
        ...resource,
        apiVersion: systemApiVersionFromComponents({ version: manifest.definition.version }),
        kind: manifest.definition.kind,
      });
    }
  }

  return result;
}

export async function rawRequest(url: string, method: string = "GET", body: string | undefined = undefined, headers: Record<string, string> = {}) {
  try {
    const opts: any = {};
    kc.applyToRequest(opts as any);
  
    const r = await fetch(
      `${kc.getCurrentCluster()!.server}/${url}`,
      {
        headers: {
          ...opts.headers,
          ...headers,
        },
        dispatcher: new Agent({
          connect: {rejectUnauthorized: false, cert: opts.cert, key: opts.key, ca: opts.ca},
        }),
        method,
        body,
      },
    );
    if (!r.ok) {
      throw new Error(`Failed to fetch ${url}: ${r.statusText}`);
    }
  
    const t = await r.json();
    return t;
  } catch (error) {
    console.error(`Error fetching ${url}`, error);
    throw error;
  }
}