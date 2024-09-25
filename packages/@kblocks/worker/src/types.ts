export type BindingContext = {
  watchEvent: "Deleted" | "Modified" | "Added";
  object: ApiObject;
};



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

  // actual state
  status?: any;

  // desired state
  [key: string]: any;
};

export type ObjectRef = {
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
