const { exec, publishEvent } = require("./util");

// regular expression that matches `${{ kblock://apigroup/name/field }}`, for example: `${{ kblock://queues.acme.com/my-queue/queueUrl }}`
const refRegex = /\$\{\{\s*kblock:\/\/([^\/]+)\/([^\/]+)\/([^}]+)\s*\}\}/;

async function resolveReferences(obj) {
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

    const match = refRegex.exec(value);
    if (match) {
      const [ _, apiGroup, name, field ] = match;
      refs[match[0]] = { apiGroup, name, field: field.trim() };
    }

    return value;
  };

  JSON.stringify(obj, finder);

  const resolved = {};

  for (const [ ref, { apiGroup, name, field } ] of Object.entries(refs)) {
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

    resolved[ref] = value;
  }

  const replacer = (_, value) => {
    if (typeof value !== "string") {
      return value;
    }

    const match = refRegex.exec(value);
    if (match) {
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