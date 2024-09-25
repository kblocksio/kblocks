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
    return {
      emit: event => {
        console.log("EVENTS_WS_URL not configured, skipping:", JSON.stringify(event));
      },
    };
  }

  // connect to the backend throught the websocket
  const ws = new ReconnectingWebSocket(EVENTS_WS_URL, [], {
    WebSocket,
    connectionTimeout: 10000,
    maxRetries: Infinity,
  });

  ws.addEventListener("open", () => {
    console.log("Connected to the sink backend");
  });

  ws.addEventListener("error", error => {
    console.error("Error connecting to the sink backend", error);
  });

  return {
    emit: event => {
      if (ws.readyState !== WebSocket.OPEN) { 
        console.log("Socket not connected, skipping event", event);
        return;
      }

      ws.send(JSON.stringify(event));
    }
  };
};
