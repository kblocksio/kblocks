import {exec, publishEvent} from "./util";

// regular expression that matches `${{ kblock://apigroup/name/field }}`, for example: `${{ kblock://queues.acme.com/my-queue/queueUrl }}`
const refRegex = /\$\{\{\s*kblock:\/\/([^\/]+)\/([^\/]+)\/([^}]+)\s*\}\}/g;

async function resolveReferences(obj) {
  const metadata = obj.metadata;
  const status = obj.status;
  const namespace = metadata?.namespace ?? "default";

  delete obj.metadata;
  delete obj.status;

  const refs = {};

  const finder = (_, value) => {
    if (typeof value !== "string") {
      return value;
    }

    const matches = value.matchAll(refRegex);
    if (matches) {
      for (const match of matches) {
        const [_, apiGroup, name, field] = match;
        refs[match[0]] = {apiGroup, name, field: field.trim()};
      }
    }

    return value;
  };

  JSON.stringify(obj, finder);

  const resolved = {};

  for (const [ref, {apiGroup, name, field}] of Object.entries(refs)) {
    await publishEvent(obj, {
      type: "Normal",
      reason: "Resolving",
      message: ref,
    });

    await exec("kubectl", ["wait", "--for=condition=Ready", `${apiGroup}/${name}`, "--timeout=5m", "-n", namespace]);

    const value = await exec("kubectl", ["get", `${apiGroup}/${name}`, "-n", namespace, "-o", `jsonpath={.status.${field}}`]);

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

    const matches = value.matchAll(refRegex);

    if (matches) {
      for (const match of matches) {
        value = value.replace(match[0], resolved[match[0]]);
      }
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
