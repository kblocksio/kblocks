import { chatCompletion } from "./ai";
import { newSlackThread } from "./slack";
import { Event, ObjectRef } from "./types";
import { exec, getenv, tryGetenv, tempdir } from "./util";
import fs from "fs";
import path from "path";
import { Events } from "./http";

export interface RuntimeHost {
  newSlackThread: typeof newSlackThread,
  getenv: typeof getenv,
  tryGetenv: typeof tryGetenv,
  exec: typeof exec,
  chatCompletion: typeof chatCompletion;
  events: Events;
}

export function kblockOutputs(host: RuntimeHost) {
  return (host.tryGetenv("KBLOCK_OUTPUTS") ?? "").split(",").filter(x => x);
}

export async function patchObjectState(host: RuntimeHost, objRef: ObjectRef, patch: any) {
  try {
    const group = objRef.apiVersion.split("/")[0];
    const type = `${objRef.kind.toLowerCase()}.${group}`;

    host.events.emit({
      type: "PATCH",
      objRef,
      patch: { status: patch },
    });

    await host.exec("kubectl", [
      "patch",
      type,
      objRef.name,
      "-n", objRef.namespace,
      "--type", "merge",
      "--subresource", "status",
      "--patch", JSON.stringify({ status: patch }),
    ], { stdio: "ignore" });
  } catch (err) {
    // just ignore errors
  }
}
export async function publishEvent(host: RuntimeHost, objRef: ObjectRef, event: Event) {
  const workdir = tempdir();
  try {
    // create a unique event name
    const name = "kblock-event-" + Math.random().toString(36).substring(7);
    const eventJson = path.join(workdir, "event.json");

  
    host.events.emit({
      type: "LIFECYCLE",
      objRef,
      event,
      timestamp: new Date().toISOString(),
    });
  
    fs.writeFileSync(eventJson, JSON.stringify({
      apiVersion: "v1",
      kind: "Event",
      metadata: { name, namespace: objRef.namespace },
      involvedObject: objRef,
      firstTimestamp: new Date(),
      reportingComponent: "kblocks/operator",
      reportingInstance: `${objRef.apiVersion}/${objRef.kind}`,
      ...event,
    }));

    await host.exec("kubectl", [
      "apply",
      "-f", eventJson
    ]);

  } catch (err: any) {
    console.warn("WARNING: unable to publish event:", err.stack);
    console.warn(objRef);
    console.warn(event);
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
}
