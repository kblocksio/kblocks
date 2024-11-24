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
  engine: z.union([ 
    z.literal("tofu"), 
    z.literal("helm"), 
    z.literal("wing"), 
    z.literal("wing/tf-aws"), 
    z.literal("wing/k8s"),
    z.literal("cdk8s"),
    z.literal("noop"),
    z.literal("custom"),
  ]),

  source: z.optional(z.object({
    url: z.string(),
    branch: z.string(),
    directory: z.string(),
  })),

  definition: z.intersection(CustomResourceDefinition, z.object({
    schema: z.any(),
    readme: z.optional(z.string()),
    description: z.optional(z.string()),
    icon: z.optional(z.string()),
    color: z.optional(z.string()),
  })),

  operator: z.optional(z.object({
    namespace: z.optional(z.string()),
    skipCrd: z.optional(z.boolean().default(false)),
    flushOnly: z.optional(z.boolean().default(false)),
    permissions: z.optional(z.array(z.object({
      apiGroups: z.array(z.string()),
      resources: z.array(z.string()),
      verbs: z.array(z.string()),
    }))),
    envSecrets: z.optional(z.union([
      z.record(z.string()),
      z.record(z.object({
          key: z.string(),
          secret: z.string(),
        }),
      ),
    ])),
    envConfigMaps: z.optional(z.record(z.string())),
    env: z.optional(z.record(z.string())),
    workers: z.optional(z.number().default(1)),
  })),
});

export type Manifest = z.infer<typeof Manifest>;

export const isCoreGroup = (group: string) => group === "core";

export const systemApiVersion = (manifest: Manifest) => 
  systemApiVersionFromComponents({ group: manifest.definition.group, version: manifest.definition.version });

export const systemApiVersionFromComponents = ({ group, version }: { group?: string, version: string }) => 
  group ? `${group}/${version}` : `core/${version}`;

export const systemApiVersionFromDisplay = (displayApiVersion: string) => {
  const [group, version] = displayApiVersion.split("/");
  return systemApiVersionFromComponents({
    group: !version ? undefined : group,
    version: !version ? group : version,
  });
};

export const displayApiVersion = (manifest: Manifest) => 
  displayApiVersionFromComponents({ group: manifest.definition.group, version: manifest.definition.version });

export const displayApiVersionFromComponents = ({ group, version }: { group: string, version: string }) => 
  isCoreGroup(group) ? version : `${group}/${version}`;
