import { Manifest } from "./api/index.js";

export interface BlockRequest {
  block: Manifest;
  source?: string;
}
