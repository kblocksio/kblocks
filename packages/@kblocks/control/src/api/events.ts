import { endpoints } from "./endpoints.js";
import { ApiObject, Event } from "./types.js";

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

// -------------------------------------------------------------------------------------------------

export function emitEvent(event: WorkerEvent) {
  const req = {
    method: "POST",
    body: JSON.stringify(event),
    headers: {
      "Content-Type": "application/json",
    },
  };

  fetch(endpoints.events, req).then(res => {
    if (!res.ok) {
      console.warn(`${endpoints.events}: ${res.status} body: ${res.statusText}`);
    }
  }).catch(err => {
    console.warn(`${endpoints.events}: ${err.cause?.message ?? err.message}`);
  });
}