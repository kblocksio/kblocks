import { chatCompletion } from "./ai";
import { newSlackThread } from "./slack";
import { ApiObject, Event } from "./types";
import { exec, getenv, tryGetenv, tempdir } from "./util";
import fs from "fs";
import path from "path";

export interface RuntimeHost {
  newSlackThread: typeof newSlackThread,
  getenv: typeof getenv,
  tryGetenv: typeof tryGetenv,
  exec: typeof exec,
  chatCompletion: typeof chatCompletion;
}

export function kblockOutputs(host: RuntimeHost) {
  return (host.tryGetenv("KBLOCK_OUTPUTS") ?? "").split(",").filter(x => x);
}

export async function patchObjectStatus(host: RuntimeHost, obj: ApiObject, patch: any) {
  try {
    const namespace = obj.metadata.namespace ?? "default";
    const group = obj.apiVersion.split("/")[0];
    const type = `${obj.kind.toLowerCase()}.${group}`;
    await host.exec("kubectl", [
      "patch",
      type,
      obj.metadata.name,
      "-n", namespace,
      "--type", "merge",
      "--subresource", "status",
      "--patch", JSON.stringify({ status: patch }),
    ], { stdio: "ignore" });
  } catch (err) {
    // just ignore errors
  }
}
export async function publishEvent(host: RuntimeHost, obj: ApiObject, event: Event) {
  const workdir = tempdir();
  try {
    const namespace = obj.metadata.namespace ?? "default";

    // create a unique event name
    const name = "kblock-event-" + Math.random().toString(36).substring(7);
    const eventJson = path.join(workdir, "event.json");
    fs.writeFileSync(eventJson, JSON.stringify({
      apiVersion: "v1",
      kind: "Event",
      metadata: { name, namespace },
      involvedObject: {
        kind: obj.kind,
        namespace,
        name: obj.metadata.name,
        uid: obj.metadata.uid,
        apiVersion: obj.apiVersion,
      },
      firstTimestamp: new Date(),
      reportingComponent: "kblocks/operator",
      reportingInstance: `${obj.apiVersion}/${obj.kind}`,
      ...event,
    }));

    await host.exec("kubectl", [
      "apply",
      "-f", eventJson
    ]);

  } catch (err: any) {
    console.warn("WARNING: unable to publish event:", err.stack);
    console.warn(obj);
    console.warn(event);
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
}
