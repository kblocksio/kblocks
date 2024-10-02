import { ApiObject } from "./types";

export type ApplyCommand = {
  type: "APPLY";
  object: ApiObject;
};

export type DeleteCommand = {
  type: "DELETE";
  objUri: string;
};

export type ControlCommand = ApplyCommand | DeleteCommand;