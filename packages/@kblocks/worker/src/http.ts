import express from "express";
import WebSocket from "ws";
import ReconnectingWebSocket from "reconnecting-websocket";

import { WorkerEvent } from "./events";

const EVENTS_WS_URL = process.env.EVENTS_WS_URL;

export interface Events {
  emit(event: WorkerEvent): void;
}

export const startServer = async (): Promise<Events> => {
  const app = express();

  app.get("/", (_, res) => {
    res.send("Hello World");
  });

  app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });

  if (!EVENTS_WS_URL) {
    console.warn("WARNING: EVENTS_WS_URL not configured, events will not be sent to the backend");
    return { emit: () => {} }; // noop
  }

  // connect to the backend throught the websocket
  const ws = new ReconnectingWebSocket(EVENTS_WS_URL, [], {
    WebSocket,
    connectionTimeout: 10000,
    maxRetries: Infinity,
  });

  return {
    emit: event => {
      if (ws.readyState !== WebSocket.OPEN) {
        // socket not connected, skip
        return;
      }

      ws.send(JSON.stringify(event));
    },
  };
};
