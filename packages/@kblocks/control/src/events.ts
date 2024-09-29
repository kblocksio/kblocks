import { WorkerEvent } from "./types";

const KBLOCKS_EVENTS_URL = process.env.KBLOCKS_EVENTS_URL;
if (!KBLOCKS_EVENTS_URL) {
  console.warn("WARNING: KBLOCKS_EVENTS_URL not configured, events will not be sent to the backend");
}

export function emitEvent(event: WorkerEvent) {
  if (!KBLOCKS_EVENTS_URL) {
    return;
  }

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
}