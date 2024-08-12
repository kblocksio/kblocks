import * as child_process from "child_process";
import fs from "fs";
import type { ApiObject } from "./types";

export function exec(command: string, args: string[], options: child_process.SpawnOptions = {}): Promise<string> {
  args = args || [];
  options = options || {};

  return new Promise((resolve, reject) => {
    console.error("$", command, args.join(" "));

    const proc = child_process.spawn(command, args, { 
      stdio: ["inherit", "pipe", "pipe"], 
      ...options,
      env: {
        ...process.env,
        ...options.env,
      }
    });
    
    proc.on("error", err => reject(err));
  
    const stdout: Uint8Array[] = [];
    const stderr: Uint8Array[] = [];
  
    proc.stdout?.on("data", data => {
      process.stdout.write(data);
      stdout.push(data);
    });

    proc.stderr?.on("data", data => {
      process.stderr.write(data);
      stderr.push(data);
    });
  
    proc.on("exit", (status) => {
      if (status !== 0) {
        return reject(new Error(Buffer.concat(stderr).toString().trim()));
      }

      return resolve(Buffer.concat(stdout).toString().trim());
    });
  });
}

export function getenv(k: string) {
  if (!process.env[k]) {
    throw new Error(`missing environment variable: ${k}`);
  }

  return process.env[k];
}

export function tryGetenv(k: string) {
  return process.env[k];
}

export async function patchStatus(obj: ApiObject, patch: any) {
  try {
    const namespace = obj.metadata.namespace ?? "default";
    const group = obj.apiVersion.split("/")[0];
    const type = `${obj.kind.toLowerCase()}.${group}`;
    await exec("kubectl", [
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

interface Event {
  type: string;
  reason: string;
  message: string;
}

export async function publishEvent(obj: ApiObject, event: Event) {
  try {
    const namespace = obj.metadata.namespace ?? "default";

    // create a unique event name
    const name = "kblock-event-" + Math.random().toString(36).substring(7);

    fs.writeFileSync("event.json", JSON.stringify({
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

    await exec("kubectl", [
      "apply",
      "-f", "event.json"
    ]);

  } catch (err: any) {
    console.error("WARNING: unable to publish event:", err.stack);
    console.error(obj);
    console.error(event);
  }
}

export function kblockOutputs() {
  return (process.env.KBLOCK_OUTPUTS ?? "").split(",").filter(x => x);
}

