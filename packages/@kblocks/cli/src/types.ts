import path from "path";
import yaml from "yaml";
import fs from "fs";
import deepmerge from "deepmerge";
import { Manifest } from "../types";

export function readManifest(dir: string): Manifest {
  const yamlfile = path.join(dir, "kblock.yaml");

  try {
    fs.accessSync(yamlfile, fs.constants.F_OK);
  } catch (error) {
    throw new Error(`${yamlfile} not found`);
  }

  const config = yaml.parse(fs.readFileSync(yamlfile, "utf8"));
  let block = Manifest.parse(config);

  for (const include of block.include ?? []) {
    const x = yaml.parse(fs.readFileSync(path.join(dir, include), "utf8"));
    block = deepmerge(block, x);
  }

  // make sure a namespace is defined
  if (!block.operator?.namespace) {
    throw new Error("namespace is required in the operator section of the manifest");
  }

  return block;
}
