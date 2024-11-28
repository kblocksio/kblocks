import { Manifest } from "@kblocks/api";
import { PodEnvironment } from "./configmap.js";

export interface BlockRequest {
  block: Manifest;
  source?: string;
  tmpSrc?: string;
}

export interface DeploymentProps {
  names: string;
  namespace: string;
  image: string;
  pod: PodEnvironment;
  blocks: {
    group: string;
    version: string
    plural: string;
    outputs?: string[];
  }[];
}
