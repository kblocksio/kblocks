import { Manifest } from "./manifest.js";

export type BindingContext = {
  watchEvent: "Deleted" | "Modified" | "Added" | "Read";
  object: ApiObject;
  requestId?: string;
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
    ownerReferences?: OwnerReference[];
    managedFields?: any[];
    deletionTimestamp?: string;
    finalizers?: string[];
  };

  // current state
  status?: {
    conditions?: Condition[];
    [key: string]: any;
  };

  // desired state
  [key: string]: any;
};

export type OwnerReference = {
  apiVersion: string;
  kind: string;
  name: string;
  uid?: string;
  blockOwnerDeletion?: boolean;
  controller?: boolean;
};


export type InvolvedObject = {
  apiVersion: string;
  kind: string;
  namespace: string;
  name: string;
  uid?: string;
};

/**
 * This needs to be compatible to k8s.io/api/core/v1/types.go#Event
 * @see https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1/
 */
export type Event = {
  type: EventType;
  reason: EventReason;
  action: EventAction;
  message: string;
};

export enum EventType {
  Normal = "Normal",
  Warning = "Warning",
}

export enum EventReason {
  Started = "Started",
  Succeeded = "Succeeded",
  Failed = "Failed",
  Resolving = "Resolving",
  Resolved = "Resolved",
}

export enum EventAction {
  Create = "CREATE",
  Update = "UPDATE",
  Delete = "DELETE",
  Sync = "SYNC",
  Read = "READ",
}

export enum StatusReason {
  Pending = "Pending",
  ResolvingReferences = "ResolvingReferences",
  InProgress = "InProgress",
  Completed = "Completed",
  Error = "Error",
}

export type KBlock = {
  manifest: Manifest;
  engine: string;
}

export type KConfig = {
  config: Record<string, any>;
}
