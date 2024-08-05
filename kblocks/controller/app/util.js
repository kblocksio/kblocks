const { spawn } = require("child_process");
const fs = require("fs");

function exec(command, args, options) {
  args = args || [];
  options = options || {};

  return new Promise((resolve, reject) => {
    console.error("$", command, args.join(" "));

    const proc = spawn(command, args, { 
      stdio: ["inherit", "pipe", "pipe"], 
      ...options,
      env: {
        ...process.env,
        ...options.env,
      }
    });
    
    proc.on("error", err => reject(err));
  
    const stdout = [];
    const stderr = [];
  
    proc.stdout.on("data", data => {
      process.stdout.write(data);
      stdout.push(data);
    });

    proc.stderr.on("data", data => {
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

function getenv(k) {
  if (!process.env[k]) {
    throw new Error(`missing environment variable: ${k}`);
  }

  return process.env[k];
}

function tryGetenv(k) {
  return process.env[k];
}

async function patchStatus(obj, patch) {
  try {
    console.error("status update:", patch);
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
    ]);
  } catch (err) {
    // just ignore errors
  }
}

// kubectl patch cm chart-app-workload2-notmetadata-c882a278 --type=merge --patch 'metadata: {'ownerReferences': [{'apiVersion': 'acme.com/v1', 'kind': 'Workload', 'name': 'ggguuueeesss', 'uid': '50921dc8-650b-4bfb-8836-1ab67206a7f2'}]}'

async function publishEvent(obj, event) {
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
      firstTimestamp: new Date().toISOString(),
      reportingComponent: "kblocks/operator",
      reportingInstance: `${obj.apiVersion}/${obj.kind}`,
      ...event,
    }));

    await exec("kubectl", [
      "apply",
      "-f", "event.json"
    ]);

  } catch (err) {
    console.error("WARNING: unable to publish event:", err.stack);
    console.error(obj);
    console.error(event);
  }
}

function kblockOutputs() {
  return (process.env.KBLOCK_OUTPUTS ?? "").split(",").filter(x => x);
}

exports.exec = exec;
exports.getenv = getenv;
exports.tryGetenv = tryGetenv;
exports.patchStatus = patchStatus;
exports.kblockOutputs = kblockOutputs;
exports.publishEvent = publishEvent;
