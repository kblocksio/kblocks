const { exec, publishEvent } = require("./util");

// regular expression that matches `${ref://apigroup/name/field}`, for example: `${ref://queues.acme.com/my-queue/queueUrl}`
const refRegex = /\$\{\s*ref:\/\/([^\/]+)\/([^\/]+)\/([^}]+)\s*\}/g;



async function resolveReferences(obj) {

  return await resolveReferencesInternal(obj, async ({ ref, apiGroup, name, namespace, field }) => {
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

async function resolveReferencesInternal(originalObj, resolver) {
  const metadata = originalObj.metadata;
  const status = originalObj.status;
  const namespace = metadata.namespace ?? "default";

  const objCopy = {
    ...originalObj,
    metadata: undefined,
    status: undefined
  };

  const refs = {};
  
  const finder = (_, value) => {
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

  const resolved = {};

  for (const [ ref, { apiGroup, name, field } ] of Object.entries(refs)) {
    try {
      resolved[ref] = await resolver({
        ref,
        apiGroup,
        name,
        namespace,
        field
      });
    } catch (e) {
      throw new Error(`Error resolving ${ref}: ${e.message}`);
    }
  }

  const replacer = (_, value) => {
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