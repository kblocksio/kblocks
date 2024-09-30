import ReconnectingWebSocket from "reconnecting-websocket";
import WebSocket from "ws";
import * as k8s from "@kubernetes/client-node";
import { Manifest, type ErrorEvent, emitEvent } from "./types";
import { flush } from "./flush";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const client = kc.makeApiClient(k8s.CustomObjectsApi);

const FIELD_MANAGER = "kblocks";

async function tryGetResource({ group, version, plural, name, namespace }: { group: string, version: string, plural: string, name: string, namespace: string }) {
  try {
    return await client.getNamespacedCustomObject(group, version, namespace, plural, name);
  } catch (error) {
    return null;
  }
}

async function createKubernetesResource({ group, version, plural, body, systemId }: { group: string, version: string, plural: string, body: any, systemId: string  }) {
  const namespace = body?.metadata?.namespace ?? "default";
  const name = body?.metadata?.name;

  try {
    // first, check if the resource already exists
    const existing = await tryGetResource({ group, version, plural, name, namespace });

    // if it does, we need to patch it
    if (existing) {
      console.log(`PATCH: ${group}/${version}/${plural}/${systemId}/${namespace}/${name}: ${JSON.stringify(body)}`);
      return await client.patchNamespacedCustomObject(
        group,
        version,
        namespace,
        plural,
        name,
        body,
        undefined,
        FIELD_MANAGER,
        undefined,
        { headers: { 'Content-Type': 'application/merge-patch+json' } }
      );
    } else {
      console.log(`CREATE: ${group}/${version}/${plural}/${systemId}/${namespace}/${name}: ${JSON.stringify(body)}`);
      return await client.createNamespacedCustomObject(
        group,
        version,
        namespace,
        plural,
        body,
        undefined,
        undefined,
        FIELD_MANAGER
      );
    }
  } catch (error: any) {
    const message = (error.body as any)?.message ?? "unknown error";
    const objType = `${group}/${version}/${plural}`;
    const objUri = `kblocks://${objType}/${systemId}/${namespace}/${name}`;
    console.error("Error creating Kubernetes resource:", JSON.stringify(body));
    emitEvent({
      type: "ERROR",
      objType,
      objUri,
      message,
      body,
    } as ErrorEvent);
  }
}

export function connect(controlUrl: string, systemId: string, manifest: Manifest) {
  const params = new URLSearchParams({ system_id: systemId }).toString();
  const group = manifest.definition.group;
  const version = manifest.definition.version;
  const plural = manifest.definition.plural;
  const url = `${controlUrl}/${group}/${version}/${plural}?${params}`;
  console.log("Connecting to control channel:", url);

  const ws = new ReconnectingWebSocket(url, [], {
    WebSocket,
    maxRetries: Infinity,
    minReconnectionDelay: 0, // 1 second
    maxReconnectionDelay: 30000, // 30 seconds
    connectionTimeout: 4000, // 4 seconds
  });

  ws.addEventListener("open", () => {
    console.log("Control connection opened");

    // flush the current state of the system to the control plane
    flush(systemId, manifest);
  });

  ws.addEventListener("message", (event) => {
    try {
      const body = JSON.parse(event.data);
      createKubernetesResource({ group, version, plural, body, systemId }).catch((error) => {
        console.error("Error creating Kubernetes resource:", error);
      });
    } catch (error) {
      console.error("Error parsing control message:", event.data);
    }
  });

  // send a ping every 10 seconds
  setInterval(() => {
    ws.send(JSON.stringify({ type: "PING" }));
  }, 10000);

  ws.addEventListener("close", (event) => {
    console.log("Control connection closed", event);
  });
}

