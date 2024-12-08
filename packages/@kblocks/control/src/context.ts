import { Manifest } from "@kblocks/api";

export type Context = {
  system: string;
  group: string;
  version: string;
  plural: string;
  requestId: string;
  manifest: Manifest;
}
