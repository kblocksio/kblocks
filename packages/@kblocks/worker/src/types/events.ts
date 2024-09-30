import { ApiObject, Event } from "./types";

export interface EventBase {
  objUri: string;
  objType: string;
}

export interface ObjectEvent extends EventBase {
  type: "OBJECT";
  object: ApiObject | {};
  reason: "CREATE" | "UPDATE" | "DELETE" | "SYNC";
}

export interface PatchEvent extends EventBase {
  type: "PATCH";
  patch: any;
}

export interface LifecycleEvent extends EventBase {
  type: "LIFECYCLE";
  event: Event;
  timestamp: string;
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
  timestamp: string;
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
    console.warn(`${KBLOCKS_EVENTS_URL}: ${err.cause?.message ?? err.message}`);
  });
}