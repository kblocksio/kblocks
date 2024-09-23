import { z } from "zod";
import path from "path";
import yaml from "yaml";
import fs from "fs";
import deepmerge from "deepmerge";

export const CustomResourceDefinition = z.object({
  group: z.string(),
  version: z.string(),
  kind: z.string(),
  plural: z.string(),
  singular: z.optional(z.string()),
  shortNames: z.optional(z.array(z.string())),
  categories: z.optional(z.array(z.string())),
  listKind: z.optional(z.string()),
  outputs: z.optional(z.array(z.string())),
});

export const Manifest = z.object({
  include: z.optional(z.array(z.string())),

  engine: z.union([ 
    z.literal("tofu"), 
    z.literal("helm"), 
    z.literal("wing"), 
    z.literal("wing/tf-aws"), 
    z.literal("wing/k8s")
  ]),

  definition: z.intersection(CustomResourceDefinition, z.object({
    schema: z.optional(z.any()),
    readme: z.string(),
    icon: z.string(),
  })),

  operator: z.optional(z.object({
    namespace: z.optional(z.string()),
    permissions: z.optional(z.array(z.object({
      apiGroups: z.array(z.string()),
      resources: z.array(z.string()),
      verbs: z.array(z.string()),
    }))),
    envSecrets: z.optional(z.record(z.string())),
    envConfigMaps: z.optional(z.record(z.string())),
    env: z.optional(z.record(z.string())),
    workers: z.optional(z.number().default(1)),
  })),
});

export type Manifest = z.infer<typeof Manifest>;


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
