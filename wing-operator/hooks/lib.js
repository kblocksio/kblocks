const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");

async function synth(ctx) {
  const obj = ctx.object;
  await updateEvent(obj, "Normal", "Applying");
  try {
    await synthObject(ctx);
    await updateEvent(obj, "Normal", "OK");
  } catch (err) {
    await updateEvent(obj, "Warning", err.stack);
  }
}

async function synthObject(ctx) {
  const obj = ctx.object;
  const entrypoint = "main.w";
  const spec = "spec.json";

  fs.writeFileSync(entrypoint, `
    bring "." as lib;
    bring fs;
    let json = fs.readJson("${spec}");
    let spec = lib.${obj.kind}Spec.fromJson(json);
    new lib.${obj.kind}(spec) as \"${obj.metadata.name}\";
  `);

  fs.writeFileSync(spec, JSON.stringify(obj));

  const command = ctx.watchEvent === "Deleted" ? "delete" : "apply";

  const objidLabel = "wing.cloud/object-id";
  const objid = crypto.createHash('md5').update(`${obj.apiVersion}-${obj.kind}-${obj.metadata.name}`).digest('hex');
  const namespace = obj.metadata.namespace ?? "default";

  const labels = {
    [objidLabel]: objid,
    "wing.cloud/api-version": obj.apiVersion.replace("/", "-"),
    "wing.cloud/kind": obj.kind,
    "wing.cloud/name": obj.metadata.name,
    ...obj.metadata.labels,
  };

  await exec("wing", ["compile", "-t", "@winglibs/k8s", entrypoint], {
    env: { WING_K8S_LABELS: JSON.stringify(labels) } 
  });

  const prune = command === "apply" ? ["--prune", "--selector", `${objidLabel}=${objid}`] : [];
  await exec("kubectl", [command, ...prune, "-n", namespace, "-f", "target/main.k8s/*.yaml"]);
  fs.rmSync(entrypoint);
}


async function updateEvent(obj, type, message) {
  const namespace = obj.metadata.namespace ?? "default";
  const id = obj.metadata.uid;

  fs.writeFileSync("event.json", JSON.stringify({
    apiVersion: "v1",
    kind: "Event",
    metadata: {
      name: `wing-${id}`,
      namespace
    },
    involvedObject: {
      kind: obj.kind,
      namespace,
      name: obj.metadata.name,
      uid: obj.metadata.uid,
      apiVersion: obj.apiVersion,
    },
    firstTimestamp: new Date().toISOString(),
    reportingComponent: "wing.cloud/operator",
    reportingInstance: `${obj.apiVersion}/${obj.kind}`,
    message,
    type,
    action: "Apply",
    reason: "Status"
  }));

  try {
    await exec("kubectl", ["apply", "-f", "event.json"]);
  } catch (err) {
    console.error("error creating event:", err.stack);
  }

  // this causes an infinite loop of updates

  // try {
  //   await exec("kubectl", [
  //     "patch",
  //     "-n",
  //     obj.metadata.namespace ?? "default",
  //     obj.kind,
  //     obj.metadata.name,
  //     "--type",
  //     "merge",
  //     "--subresource",
  //     "status",
  //     "--patch-file",
  //     "status-patch.json",
  //   ]);
  // } catch (err) {
  //   console.error("error updating status:", err.stack);
  // }
}

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

module.exports = {
  exec,
  synth,
};
