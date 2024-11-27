import { ApiObject } from "@kblocks/api";

export type BindingContext = {
  watchEvent: "Deleted" | "Modified" | "Added" | "Read";
  object: ApiObject;
  requestId?: string;
};
