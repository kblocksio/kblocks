import crypto from "crypto";
import { patchObjectState, RuntimeContext } from "./host.js";
import { ApiObject } from "./api/index.js";

export async function updateLastStateHash(host: RuntimeContext, obj: ApiObject) {
  const oldValue = obj.status?.lastStateHash;
  const newValue = createHashFromObject(obj);

  if (oldValue === newValue) {
    return false;
  }

  await patchObjectState(host, {
    "lastStateHash": newValue,
  });

  return true;
}

export async function saveLastStateHash(host: RuntimeContext, obj: ApiObject) {
  return patchObjectState(host, {
    "lastStateHash": createHashFromObject(obj),
  });
}

export function createHashFromObject(obj: ApiObject) {
  const hash = createHashFromData({
    ...obj.metadata.labels ?? {},
    generation: `${obj.metadata?.generation ?? 0}`,
  });

  return hash;
}

export function createHashFromData(data: Record<string, string>) {
  const sortedKeys = Object.keys(data).sort();
  const sortedValues = sortedKeys.map(key => data[key]);

  const sortedData = sortedValues.join("\n");
  return crypto.createHash("sha256").update(sortedData).digest("hex").substring(0, 62);
}