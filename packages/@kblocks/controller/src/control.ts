import ReconnectingWebSocket from "reconnecting-websocket";
import WebSocket from "ws";

const KBLOCKS_CONTROL_URL = process.env.KBLOCKS_CONTROL_URL;
if (!KBLOCKS_CONTROL_URL) {
  console.warn("KBLOCKS_CONTROL_URL is not set, control will not be available");
}

export function startControl({ apiVersion, kind, systemId }: { apiVersion: string, kind: string, systemId: string }) {
  console.log("Starting control");
  if (!KBLOCKS_CONTROL_URL) {
    return;
  }

  const params = new URLSearchParams({
    api_version: apiVersion,
    kind,
    system_id: systemId,
  }).toString();

  const url = `${KBLOCKS_CONTROL_URL}?${params}`;

  console.log("Control URL:", url);

  const ws = new ReconnectingWebSocket(url, [], {
    WebSocket,
    maxRetries: Infinity,
    minReconnectionDelay: 1000, // 1 second
    maxReconnectionDelay: 30000, // 30 seconds
    minUptime: 5000, // 5 seconds
    connectionTimeout: 4000, // 4 seconds
  });

  ws.addEventListener("open", () => {
    console.log("Control connection opened");
  });

  ws.addEventListener("message", (event) => {
    console.log("Control message:", event.data);
  });

  ws.addEventListener("close", () => {
    console.log("Control connection closed");
  });
}
