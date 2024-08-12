import type { ApiObject } from "./types";
import { exec, publishEvent } from "./util";

// regular expression that matches `${ref://apigroup/name/field}`, for example: `${ref://queues.acme.com/my-queue/queueUrl}`
const refRegex = /\$\{\s*ref:\/\/([^\/]+)\/([^\/]+)\/([^}]+)\s*\}/g;

type Resolver = (context: ResolveContext) => Promise<string>;

interface ResolveContext {
  ref: string;
  apiGroup: string;
  name: string;
  namespace: string;
  field: string;
}

export async function resolveReferences(obj: ApiObject) {

  return await resolveReferencesInternal(obj, async ({ ref, apiGroup, name, namespace, field }: ResolveContext) => {
    await publishEvent(obj, {
      type: "Normal",
      reason: "Resolving",
      message: ref,
    });

    await exec("kubectl", [ 
      "wait",
      "--for=condition=Ready",
      `${apiGroup}/${name}`,
      "--timeout=5m",
      "-n", namespace
    ]);

    const value = await exec("kubectl", [ 
      "get", `${apiGroup}/${name}`,
      "-n", namespace,
      "-o", `jsonpath={.status.${field}}`
    ]);

    await publishEvent(obj, {
      type: "Normal",
      reason: "Resolved",
      message: `${ref}=${value}`,
    });

    return value;  
  });
}

export async function resolveReferencesInternal(originalObj: ApiObject, resolver: Resolver) {
  const metadata = originalObj.metadata;
  const status = originalObj.status;
  const namespace = metadata.namespace ?? "default";

  const objCopy = {
    ...originalObj,
    metadata: undefined,
    status: undefined
  };

  
  const refs: Record<string, { apiGroup: string, name: string, field: string }> = {};
  
  const finder = (_: string, value: any) => {
    if (typeof value !== "string") {
      return value;
    }

    for (const match of value.matchAll(refRegex)) {
      const [ _, apiGroup, name, field ] = match;
      refs[match[0]] = { apiGroup, name, field: field.trim() };
    }

    return value;
  };

  // we use JSON.stringify to deeply visit all properties of the object
  JSON.stringify(objCopy, finder);

  const resolved: Record<string, string> = {};

  for (const [ ref, { apiGroup, name, field } ] of Object.entries(refs)) {
    try {
      resolved[ref] = await resolver({
        ref,
        apiGroup,
        name,
        namespace,
        field
      });
    } catch (e: any) {
      throw new Error(`Error resolving ${ref}: ${e.message}`);
    }
  }

  const replacer = (_: string, value: any) => {
    if (typeof value !== "string") {
      return value;
    }

    while (true) {
      const match = new RegExp(refRegex).exec(value);
      if (!match) {
        break;
      }

      value = value.slice(0, match.index) + resolved[match[0]] + value.slice(match.index + match[0].length);
    }

    return value;
  };

  return {
    ...JSON.parse(JSON.stringify(objCopy, replacer)),
    metadata,
    status,
  };
}

exports.resolveReferences = resolveReferences;
exports.resolveReferencesInternal = resolveReferencesInternal;