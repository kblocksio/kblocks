import crypto from "crypto";
import deepmerge from "deepmerge";
import { patchObjectState, RuntimeContext } from "./host.js";
import { ApiObject, Condition } from "./api/index.js";

export async function updateLastStateHash(statusUpdate: ReturnType<typeof statusUpdater>, obj: ApiObject) {
  const oldValue = obj.status?.lastStateHash;
  const newValue = createHashFromObject(obj);

  if (oldValue === newValue) {
    return false;
  }

  await statusUpdate({
      lastStateHash: newValue,
    },
    { quiet: true },
  );

  return true;
}

function createHashFromObject(obj: ApiObject) {
  const hash = createHashFromData({
    ...obj.metadata.labels ?? {},
    generation: `${obj.metadata?.generation ?? 0}`,
  });

  return hash;
}

function createHashFromData(data: Record<string, string>) {
  const sortedKeys = Object.keys(data).sort();
  const sortedValues = sortedKeys.map(key => data[key]);

  const sortedData = sortedValues.join("\n");
  return crypto.createHash("sha256").update(sortedData).digest("hex").substring(0, 62);
}

export function statusUpdater(host: RuntimeContext, current: ApiObject) {
  let currentStatus = current.status ?? {};

  return async (update: Record<string, any>, { quiet = false }: { quiet?: boolean } = {}) => {
    currentStatus = _renderPatch(currentStatus, update);
    return patchObjectState(host, currentStatus, { quiet });
  };
}

export const _renderPatch = (currentStatus: Record<string, any>, update: Record<string, any>) => {
  // if the update doesn't include conditions, just send it as is
  if (!update.conditions) {
    return update;
  }

  const mergeConditions = (current: Condition[], newConditions: Condition[]) => {
    const conditions = [...current];
    newConditions.forEach(newCondition => {
      const conditionIndex = conditions.findIndex(c => c.type === newCondition.type);
      if (conditionIndex !== -1) {
        conditions[conditionIndex] = newCondition;
      } else {
        conditions.push(newCondition);
      }
    });
    return conditions;
  };

  const patch = deepmerge(currentStatus, update, {
    customMerge: (key: string) => {
      if (key === "conditions") {
        return mergeConditions;
      }
    },
  });

  return patch;
}
