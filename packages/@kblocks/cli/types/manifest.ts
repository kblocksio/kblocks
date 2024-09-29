import { z } from "zod";

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
    z.literal("wing/k8s"),
    z.literal("noop"),
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
