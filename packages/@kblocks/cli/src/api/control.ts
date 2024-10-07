import { ApiObject } from "./types.js";

/**
 * Apply command is used to create or update a resource.
 */
export type ApplyCommand = {
  type: "APPLY";
  object: ApiObject;
};

/**
 * Deletes a resource. If the resource does not exist, an "OBJECT" event with an empty object will
 * be published.
 */
export type DeleteCommand = {
  type: "DELETE";
  objUri: string;
};

/**
 * Refresh command is used to refresh the state of a resource. As a result of this command, an
 * "OBJECT" event will be published with the current state of the resource. If the resource does not
 * exist, the object will be empty.
 */
export type RefreshCommand = {
  type: "REFRESH";
  objUri: string;
};

export type ControlCommand = ApplyCommand | DeleteCommand | RefreshCommand;