import { Manifest } from "./api/index.js";
import { PodEnvironment } from "./configmap.js";

export interface BlockRequest {
  block: Manifest;
  source?: string;
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
