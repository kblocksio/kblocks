const { exec, publishEvent } = require("./util");

// regular expression that matches `${ref://apigroup/name/field}`, for example: `${ref://queues.acme.com/my-queue/queueUrl}`
const refRegex = /\$\{\s*ref:\/\/([^\/]+)\/([^\/]+)\/([^}]+)\s*\}/g;



async function resolveReferences(obj) {
  const objCopy = { ...obj };

  return await resolveReferencesInternal(obj, async ({ ref, apiGroup, name, namespace, field }) => {
    await publishEvent(objCopy, {
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

    await publishEvent(objCopy, {
      type: "Normal",
      reason: "Resolved",
      message: `${ref}=${value}`,
    });

    return value;
  });
}

async function resolveReferencesInternal(obj, resolver) {
  const metadata = obj.metadata;
  const status = obj.status;
  const namespace = metadata.namespace ?? "default";

  delete obj.metadata;
  delete obj.status;

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

  JSON.stringify(obj, finder);

  const resolved = {};

  for (const [ ref, { apiGroup, name, field } ] of Object.entries(refs)) {
    resolved[ref] = await resolver({
      ref,
      apiGroup,
      name,
      namespace,
      field
    });
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
    ...JSON.parse(JSON.stringify(obj, replacer)),
    metadata,
    status,
  };
}

exports.resolveReferences = resolveReferences;
exports.resolveReferencesInternal = resolveReferencesInternal;