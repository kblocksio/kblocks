import express from "express";

import { WorkerEvent } from "./types";

const KBLOCKS_EVENTS_URL = process.env.KBLOCKS_EVENTS_URL;

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

  if (!KBLOCKS_EVENTS_URL) {
    console.warn("WARNING: KBLOCKS_EVENTS_URL not configured, events will not be sent to the backend");
    return { emit: () => {} }; // noop
  }

  return {
    emit: event => {
      const req = {
        method: "POST",
        body: JSON.stringify(event),
        headers: {
          "Content-Type": "application/json",
        },
      };

      fetch(KBLOCKS_EVENTS_URL, req).then(res => {
        if (!res.ok) {
          console.warn("Failed to send event to backend", res);
        }
      }).catch(err => {
        console.warn("Failed to send event to backend", err);
      });
    },
  };
};
