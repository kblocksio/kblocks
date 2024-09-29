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