import { ApiObject } from "@kblocks/api";
import { patchCoreResource } from "./client";

export function isObjectDeleting(object: ApiObject, finalizer: string) {
  return !!object.metadata.deletionTimestamp && object.metadata.finalizers?.includes(finalizer);
}

export function removeFinalizer(object: ApiObject, finalizer: string) {
  if (!object.metadata.finalizers) {
    return;
  }

  object.metadata.finalizers = object.metadata.finalizers.filter(f => f !== finalizer);
  return patchCoreResource({
    version: object.apiVersion,
    plural: object.kind,
    name: object.metadata.name,
    namespace: object.metadata.namespace ?? "default",
    object: {
      metadata: {
        finalizers: object.metadata.finalizers,
      },
    },
  });
}
