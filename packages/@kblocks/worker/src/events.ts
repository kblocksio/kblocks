import { ApiObject, Event, ObjectRef } from "./types";

export interface ObjectEvent {
  type: "OBJECT";
  object: ApiObject | {};
  objRef: ObjectRef;
  reason: "CREATE" | "UPDATE" | "DELETE" | "SYNC";
}

export interface PatchEvent {
  type: "PATCH";
  objRef: ObjectRef;
  patch: any;
}

export interface LifecycleEvent {
  type: "LIFECYCLE";
  objRef: ObjectRef;
  event: Event;
  timestamp: string;
}


export interface NotificationEvent {
  type: "NOTIFICATION";
  message: string;
}

export interface LogEvent {
  type: "LOG";
  message: string;
}

export interface HelloEvent {
  type: "HELLO";
  message: string;
  workerIndex: number;
  configuration?: Record<string, string>;
}

export interface ErrorEvent {
  type: "ERROR";
  message: string;
  stack?: string;
  explanation?: any;
}

export type WorkerEvent = 
  ObjectEvent 
  | PatchEvent
  | NotificationEvent 
  | LogEvent
  | NotificationEvent  
  | HelloEvent
  | LifecycleEvent
  | ErrorEvent;