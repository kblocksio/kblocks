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

export function statusUpdater(host: RuntimeContext, api: ApiObject) {
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

  // only "inherit" the conditions from the previous status (the rest we don't want to send to the patch)
  const prev: any = {
    conditions: api.status?.conditions ?? [],
  };

  return async (status: Record<string, any>, { quiet = false }: { quiet?: boolean } = {}) => {
    const patch = deepmerge(prev, status, {
      customMerge: (key: string) => {
        if (key === "conditions") {
          return mergeConditions;
        }
      },
    });

    return patchObjectState(host, patch, { quiet });
  };
}
