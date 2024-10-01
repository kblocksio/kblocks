import { Manifest } from "./manifest.js";
export type BindingContext = {
  watchEvent: "Deleted" | "Modified" | "Added";
  object: ApiObject;
};


export interface Condition {
  type?: string;
  status?: string;
  lastTransitionTime?: string;
  lastProbeTime?: string;
  reason?: string;
  message?: string;
}

export type ApiObject =  {
  apiVersion: string;
  kind: string;

  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp?: string;
    generation?: number;
    resourceVersion?: string;
    uid?: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
    managedFields?: any[];
  };

  // current state
  status?: {
    conditions?: Condition[];
    [key: string]: any;
  };

  // desired state
  [key: string]: any;
};

export type InvolvedObject = {
  apiVersion: string;
  kind: string;
  namespace: string;
  name: string;
  uid?: string;
};

export type Event = {
  type: string;
  reason: string;
  message: string;
};

export enum StatusReason {
  ResolvingReferences = "ResolvingReferences",
  InProgress = "InProgress",
  Completed = "Completed",
  Error = "Error",
}

export type KConfig = {
  manifest: Manifest;
  api: ApiObject;
  engine: string;
  config: Record<string, any>;
}
