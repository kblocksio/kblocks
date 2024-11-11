import fs from "fs";
import path from "path";
import child_process from "child_process";
import { chatCompletion } from "./ai.js";
import { newSlackThread } from "./slack.js";
import { Event, InvolvedObject, emitEvent } from "./api/index.js";
import { getenv, tryGetenv, tempdir, exec } from "./util.js";
import { type createLogger } from "./logging.js";

export interface RuntimeContext {
  newSlackThread: typeof newSlackThread,
  getenv: typeof getenv,
  tryGetenv: typeof tryGetenv,
  exec: (command: string, args: string[], options?: child_process.SpawnOptions) => Promise<string>,
  chatCompletion: typeof chatCompletion;
  emitEvent: typeof emitEvent;
  objUri: string;
  objRef: InvolvedObject;
  objType: string;
  system: string;
  logger: ReturnType<typeof createLogger>;
  requestId: string;
}

export function kblockOutputs(host: RuntimeContext) {
  return (host.tryGetenv("KBLOCK_OUTPUTS") ?? "").split(",").filter(x => x);
}

export async function patchObjectState(host: RuntimeContext, patch: any, { quiet = false }: { quiet?: boolean } = {}) {
  const group = host.objRef.apiVersion.split("/")[0];
  const kind = host.objRef.kind.toLowerCase();
  const type = group ? `${kind}.${group}` : kind;

  const command = [
    "patch",
    type,
    host.objRef.name,
    "-n", host.objRef.namespace,
    "--type", "merge",
    "--subresource", "status",
    "--patch", JSON.stringify({ status: patch }),
  ];

  if (quiet) {
    await exec(undefined, "kubectl", command);
  } else {
    await host.exec("kubectl", command);
  }
}

export async function publishNotification(host: RuntimeContext, event: Event) {
  const workdir = tempdir();
  try {
    // create a unique event name
    const name = "kblock-event-" + Math.random().toString(36).substring(7);
    const eventJson = path.join(workdir, "event.json");

    host.emitEvent({
      requestId: host.requestId,
      type: "LIFECYCLE",
      objUri: host.objUri,
      objType: host.objType,
      event,
      timestamp: new Date(),
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

    await exec(undefined, "kubectl", [
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
