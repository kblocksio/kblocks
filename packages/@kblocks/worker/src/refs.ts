import { RuntimeContext, publishNotification } from "./host.js";
import { EventAction, EventReason, EventType, type ApiObject } from "./api/index.js";

// regular expression that matches `${ref://apigroup/name/field}` or `${ref://apigroup/name/field?timeout=value}`, 
// for example: `${ref://queues.acme.com/my-queue/queueUrl}` or `${ref://queues.acme.com/my-queue/queueUrl?timeout=10}`
const refRegex = /\$\{\s*ref:\/\/([^\/]+)\/([^\/]+)\/([^?}]+)(?:\?timeout=(\d+))?\s*\}/g;

type Resolver = (context: ResolveContext) => Promise<string>;

interface ResolveContext {
  ref: string;
  apiGroup: string;
  name: string;
  namespace: string;
  field: string;
  timeout?: number;
}

export async function resolveReferences(action: EventAction, cwd: string, host: RuntimeContext, obj: ApiObject) {

  return await resolveReferencesInternal(obj, async ({ ref, apiGroup, name, namespace, field, timeout }: ResolveContext) => {
    const kubectl = (...args: string[]) => host.exec("kubectl", args, { cwd });

    await publishNotification(host, {
      reason: EventReason.Resolving,
      type: EventType.Normal,
      message: ref,
      action,
    });

    await kubectl(
      "wait",
      "--for=condition=Ready",
      `${apiGroup}/${name}`,
      `--timeout=${timeout ?? "5m"}`,
      "-n", namespace
    );

    const value = await kubectl(
      "get", `${apiGroup}/${name}`,
      "-n", namespace,
      "-o", `jsonpath={.status.${field}}`
    );

    await publishNotification(host, {
      type: EventType.Normal,
      reason: EventReason.Resolved,
      action,
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

  
  const refs: Record<string, { apiGroup: string, name: string, field: string, timeout?: number }> = {};
  
  const finder = (_: string, value: any) => {
    if (typeof value !== "string") {
      return value;
    }

    for (const match of value.matchAll(refRegex)) {
      const [ _, apiGroup, name, field, timeout ] = match;
      refs[match[0]] = { apiGroup, name, field: field.trim(), timeout };
    }

    return value;
  };

  // we use JSON.stringify to deeply visit all properties of the object
  JSON.stringify(objCopy, finder);

  const resolved: Record<string, string> = {};

  for (const [ ref, { apiGroup, name, field, timeout } ] of Object.entries(refs)) {
    try {
      resolved[ref] = await resolver({
        ref,
        apiGroup,
        name,
        namespace,
        field,
        timeout
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
