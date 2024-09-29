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
      console.warn(`${KBLOCKS_EVENTS_URL}: ${res.status} body: ${res.statusText}`);
    }
  }).catch(err => {
    console.warn(`${KBLOCKS_EVENTS_URL}: ${err?.message}`);
  });
}