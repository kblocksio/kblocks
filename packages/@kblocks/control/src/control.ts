import * as k8s from "@kubernetes/client-node";
import ReconnectingWebSocket from "reconnecting-websocket";
import WebSocket from "ws";
import { ControlCommand, Manifest } from "./api";
import { flush } from "./flush";
import { applyObject } from "./apply";
import { deleteObject } from "./delete";
import { Context } from "./context";
import { refreshObject } from "./refresh";
import { patchObject } from "./patch";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const client = kc.makeApiClient(k8s.CustomObjectsApi);

export function connect(controlUrl: string, system: string, manifest: Manifest) {
  const params = new URLSearchParams({ system }).toString();

  const group = manifest.definition.group;
  const version = manifest.definition.version;
  const plural = manifest.definition.plural;
  const url = `${controlUrl}/${group}/${version}/${plural}?${params}`;

  const ctx: Context = { system, group, version, plural };

  console.log(`Connecting to control channel: ${url}`);

  const ws = new ReconnectingWebSocket(url, [], {
    WebSocket,
    maxRetries: Infinity,       // never give up
    minReconnectionDelay: 0,    // try to reconnect as fast as possible
    maxReconnectionDelay: 5000, // dont wait more than 5 seconds between reconnections
    connectionTimeout: 10000,    // wait 10 seconds for the connection to open before timing out
  });

  ws.addEventListener("open", () => {
    console.log("Control connection opened");

    // flush the current state of the system to the control plane
    flush(system, manifest);
  });

  ws.addEventListener("message", (event) => {
    handleCommandMessage(ctx, event.data).catch((error) => {
      console.error(`Error handling control message: ${event.data}`);
      console.error(error);
    });
  });

  ws.addEventListener("close", (event) => {
    console.log(`Control connection closed: ${JSON.stringify({ code: event.code, reason: event.reason, type: event.type })}`);
  });

  keepalive(ws);

  return ws;
}

function keepalive(ws: ReconnectingWebSocket) {
  let interval: NodeJS.Timeout;

  const ping = () => {
    try {
      ws.send(JSON.stringify({ type: "PING" }));
    } catch (error: any) {
      console.error("Error sending keepalive:", error.message);
    }
  };

  ws.addEventListener("open", () => {
    interval = setInterval(ping, 10000);
    console.log("Control connection opened. Starting keepalive.");
  });

  ws.addEventListener("close", () => {
    console.log("Control connection closed. Stopping keepalive.");
    clearInterval(interval);
  });
}

async function handleCommandMessage(ctx: Context, message: string) {
  let command: ControlCommand;

  try {
    command = JSON.parse(message) as ControlCommand;
  } catch (error: any) {
    throw new Error(`Error parsing control command '${message}': ${error.message}`);
  }

  const type = command.type;

  if (!type) {
    throw new Error(`Invalid control command. Missing 'type' field: ${JSON.stringify(command)}`);
  }

  switch (type) {
    case "APPLY":
      return await applyObject(client, ctx, command.object);

    case "PATCH":
      return await patchObject(client, ctx, command.objUri, command.object);

    case "DELETE":
      return await deleteObject(client, ctx, command.objUri);

    case "REFRESH":
      return await refreshObject(client, ctx, command.objUri);

    default:
      throw new Error(`Unsupported control command type: '${type}'`);
  }
}