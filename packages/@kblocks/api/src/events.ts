import { getEndpoints } from "./endpoints.js";
import { ApiObject, Event } from "./types.js";

export interface EventBase {
  objUri: string;
  objType: string;
  timestamp: Date;
}

export interface ObjectEvent extends EventBase {
  type: "OBJECT";
  object: ApiObject | {};
  reason: "CREATE" | "UPDATE" | "DELETE" | "SYNC" | "READ";
}

export interface PatchEvent extends EventBase {
  type: "PATCH";
  patch: any;
}

export interface LifecycleEvent extends EventBase {
  type: "LIFECYCLE";
  event: Event;
}

export enum LogLevel {
  DEBUG,
  INFO,
  WARNING,
  ERROR
}

export interface LogEvent extends EventBase {
  type: "LOG";
  level: LogLevel;
  message: string;

  /**
   * The ID of the log group this message belongs to.
   */
  logId?: string;
  parentLogId?: string;
}

export interface ErrorEvent extends EventBase {
  type: "ERROR";
  message: string;
  body?: any;
  stack?: string;
  explanation?: any;
}

export type WorkerEvent = 
  ObjectEvent 
  | PatchEvent
  | LogEvent
  | LifecycleEvent
  | ErrorEvent;

// -------------------------------------------------------------------------------------------------

const MAX_TRIES = 5;
const INITIAL_DELAY = 250;
const EXPONENTIAL_BACKOFF = 1.5;

export function emitEvent(event: WorkerEvent) {
  emitEventAsync(event).catch(err => {
    console.error(err);

    // restart the pod to give it a chance to recover
    process.exit(1);
  });
}

export async function emitEventAsync(event: WorkerEvent) {
  const sleep = async (ms: number) => {
    return new Promise(ok => setTimeout(ok, ms));
  };

  const req = {
    method: "POST",
    body: JSON.stringify(event),
    headers: {
      "Content-Type": "application/json",
    },
  };

  const eventsEndpoint = getEndpoints().events;
  let tries = MAX_TRIES;
  let delay = INITIAL_DELAY;

  while (true) {
    try {
      const res = await fetch(eventsEndpoint, req);
      if (res.ok) {
        return;
      }

      throw new Error(`${res.status} ${res.statusText}`);
    } catch (err: any) {

      if (tries === 0) {
        throw new Error(`Failed to emit event to ${eventsEndpoint} after ${MAX_TRIES} tries: ${err.cause?.message ?? err.message}`);
      }

      console.warn(`Error sending event to ${eventsEndpoint}: ${err.cause?.message ?? err.message}`);
      console.warn(`Retrying in ${delay}ms... (${tries} tries left)`);
      await sleep(delay);
      delay = Math.floor(delay * EXPONENTIAL_BACKOFF);
      tries--;
    }
  }
}
