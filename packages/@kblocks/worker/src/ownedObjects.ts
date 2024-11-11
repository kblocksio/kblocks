import * as k8s from '@kubernetes/client-node';
import { fetch, Agent } from 'undici';
import { ApiObject } from './api/index.js';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

interface ApiGroup extends Api {
  group: string;
  version: string;
}

interface Api {
  name: string;
  kind: string;
  plural: string;
}

export async function findOwnedObjects(ownerObject: ApiObject["metadata"]) {
  const apis = kc.makeApiClient(k8s.ApisApi);
  const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
  const ownedObjects: k8s.KubernetesObject[] = [];

  const isOwnedBy = (obj: k8s.KubernetesObject) => {
    return obj.metadata?.ownerReferences?.some(ref => 
      ref.uid === ownerObject.uid
    );
  };

  const pods = await coreV1Api.listNamespacedPod(ownerObject.namespace!);
  ownedObjects.push(...pods.body.items.filter(isOwnedBy));
  
  const services = await coreV1Api.listNamespacedService(ownerObject.namespace!);
  ownedObjects.push(...services.body.items.filter(isOwnedBy));

  const secrets = await coreV1Api.listNamespacedSecret(ownerObject.namespace!);
  ownedObjects.push(...secrets.body.items.filter(isOwnedBy));

  const cms = await coreV1Api.listNamespacedConfigMap(ownerObject.namespace!);
  ownedObjects.push(...cms.body.items.filter(isOwnedBy));

  const sas = await coreV1Api.listNamespacedServiceAccount(ownerObject.namespace!);
  ownedObjects.push(...sas.body.items.filter(isOwnedBy));

  const allApis = await listApiGroups(apis);
  const resources = (await Promise.all(allApis.map(a => listNamespacedCustomObject(a.group, a.version, ownerObject.namespace!, a.name)))).filter(r => r !== null);
  ownedObjects.push(...resources.flatMap(r => r).filter(isOwnedBy));  

  return ownedObjects;
}

export async function listApiGroups(apis: k8s.ApisApi) {
  const allApis: ApiGroup[] = [];
  const apiGroups = await apis.getAPIVersions();
  const res = await Promise.all(
    apiGroups.body.groups.map(g => 
      Promise.all(g.versions.map(v => 
        rawRequest(`apis/${g.name}/${v.version}`).then((r: any) => r.resources.map((re: any) => ({ group: g.name, version: v.version, ...re }))))
      )
    )
  );

  for (const group of res) {
    for (const version of group) {
      for (const resource of version) {
        if (!resource.name.includes('/') && resource.name !== "events") {
          allApis.push(resource);
        }
      }
    }
  }
  return allApis;
}

async function listNamespacedCustomObject(group: string, version: string, namespace: string, plural: string) {
  try {
    const client = kc.makeApiClient(k8s.CustomObjectsApi);
    const resources = await client.listNamespacedCustomObject(group, version, namespace, plural);
    return (resources.body as any).items.map((i: any) => ({ ...i, group, version, plural }));
  } catch (error) {
    // ignore
    return null;
  }
}

async function rawRequest(url: string) {
  try {
    const opts: any = {};
    kc.applyToRequest(opts as any);
  
    const r = await fetch(
      `${kc.getCurrentCluster()!.server}/${url}`,
      { headers: opts.headers, dispatcher: new Agent({
        connect: {rejectUnauthorized: false, cert: opts.cert, key: opts.key, ca: opts.ca},
      }) },
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
