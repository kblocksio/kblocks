import { chatCompletion } from "./ai";
import { newSlackThread } from "./slack";
import { Event, InvolvedObject } from "./types";
import { getenv, tryGetenv, tempdir } from "./util";
import fs from "fs";
import path from "path";
import { Events } from "./http";
import { type createLogger } from "./logging";
import child_process from "child_process";


export interface RuntimeContext {
  newSlackThread: typeof newSlackThread,
  getenv: typeof getenv,
  tryGetenv: typeof tryGetenv,
  exec: (command: string, args: string[], options?: child_process.SpawnOptions) => Promise<string>,
  chatCompletion: typeof chatCompletion;
  events: Events;
  objUri: string;
  objRef: InvolvedObject;
  objType: string;
  logger: ReturnType<typeof createLogger>;
}

export function kblockOutputs(host: RuntimeContext) {
  return (host.tryGetenv("KBLOCK_OUTPUTS") ?? "").split(",").filter(x => x);
}

export async function patchObjectState(host: RuntimeContext, patch: any) {
  try {
    const group = host.objRef.apiVersion.split("/")[0];
    const type = `${host.objRef.kind.toLowerCase()}.${group}`;

    host.events.emit({
      type: "PATCH",
      objUri: host.objUri,
      objType: host.objType,
      patch: { status: patch },
    });

    await host.exec("kubectl", [
      "patch",
      type,
      host.objRef.name,
      "-n", host.objRef.namespace,
      "--type", "merge",
      "--subresource", "status",
      "--patch", JSON.stringify({ status: patch }),
    ], { stdio: "ignore" });
  } catch (err) {
    // just ignore errors
  }
}
export async function publishEvent(host: RuntimeContext, event: Event) {
  const workdir = tempdir();
  try {
    // create a unique event name
    const name = "kblock-event-" + Math.random().toString(36).substring(7);
    const eventJson = path.join(workdir, "event.json");

    host.events.emit({
      type: "LIFECYCLE",
      objUri: host.objUri,
      objType: host.objType,
      event,
      timestamp: new Date().toISOString(),
    });
  
    fs.writeFileSync(eventJson, JSON.stringify({
      apiVersion: "v1",
      kind: "Event",
      metadata: { name, namespace: host.objRef.namespace },
      involvedObject: host.objRef,
      firstTimestamp: new Date(),
      reportingComponent: "kblocks/operator",
      reportingInstance: `${host.objRef.apiVersion}/${host.objRef.kind}`,
      ...event,
    }));

    await host.exec("kubectl", [
      "apply",
      "-f", eventJson
    ]);

  } catch (err: any) {
    console.warn("WARNING: unable to publish event:", err.stack);
    console.warn(host.objRef);
    console.warn(event);
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
}
