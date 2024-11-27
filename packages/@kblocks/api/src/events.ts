import { getEndpoints } from "./endpoints.js";
import { ApiObject, Event } from "./types.js";

export interface EventBase {
  objUri: string;
  objType: string;
  timestamp: Date;
  requestId: string;
}

export interface ObjectEvent extends EventBase {
  type: "OBJECT";
  object: ApiObject | {};
  reason: "CREATE" | "UPDATE" | "DELETE" | "SYNC" | "READ";
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
  | LogEvent
  | LifecycleEvent
  | ErrorEvent;
