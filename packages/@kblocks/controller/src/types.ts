import path from "path";

export type BindingContext = {
  watchEvent: "Deleted" | "Modified" | "Added";
  object: ApiObject;
};

export type ApiObject =  {
  apiVersion: string;
  kind: string;
  status?: any;
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

  
};


export interface Event {
  type: string;
  reason: string;
  message: string;
}


