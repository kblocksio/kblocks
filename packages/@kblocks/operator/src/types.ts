import { ApiObject } from "./api";

export type BindingContext = {
  watchEvent: "Deleted" | "Modified" | "Added";
  object: ApiObject;
};
