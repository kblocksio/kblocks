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

export function emitEvent(event: WorkerEvent) {
  const req = {
    method: "POST",
    body: JSON.stringify(event),
    headers: {
      "Content-Type": "application/json",
    },
  };

  const eventsEndpoint = getEndpoints().events;
  fetch(eventsEndpoint, req).then(res => {
    if (!res.ok) {
      console.warn(`${eventsEndpoint}: ${res.status} body: ${res.statusText}`);
    }
  }).catch(err => {
    console.warn(`${eventsEndpoint}: ${err.cause?.message ?? err.message}`);
  });
}