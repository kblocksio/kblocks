export type BlockUriComponents = {
  group: string;      // e.g. acme.com
  version: string;    // e.g. v1
  plural: string;     // e.g. buckets
  system: string;     // system id
  namespace: string;  // k8s namespace of the object (metadata.namespace)
  name: string;       // k8s name of the object (metadata.name)
}

export function parseBlockUri(uri: string): BlockUriComponents {
  if (!uri.startsWith("kblocks://")) {
    throw new Error(`Invalid kblocks URI, must start with kblocks://, got: ${uri}`);
  }

  const rest = uri.split("kblocks://")[1];
  const [group, version, plural, system, namespace, name] = rest.split("/");

  if (!group || !version || !plural || !system || !namespace || !name) {
    throw new Error(`Invalid kblocks URI, got: ${uri}`);
  }

  return { group, version, plural, system, namespace, name };
}

export function formatBlockType(components: BlockUriComponents): string {
  return formatBlockTypeFromGVP(components);
}

export function formatBlockTypeFromGVP({ group, version, plural }: { group: string, version: string, plural: string }): string {
  return `${group}/${version}/${plural}`;
}

export function blockTypeFromUri(uri: string): string {
  return formatBlockType(parseBlockUri(uri));
}

export function formatBlockUri(components: BlockUriComponents): string {
  return `kblocks://${components.group}/${components.version}/${components.plural}/${components.system}/${components.namespace}/${components.name}`;
}

export function formatBlockTypeForEnv(args: { group: string, version: string, plural: string }): string {
  return formatBlockTypeFromGVP(args)
    .replace(/\//g, "-")
    .replace(/\./g, "-")
    .toUpperCase();
}
