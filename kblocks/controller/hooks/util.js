const { spawn } = require("child_process");

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

async function patchStatus(obj, patch) {
  const namespace = obj.metadata.namespace ?? "default";
  const group = obj.apiVersion.split("/")[0];
  const type = `${obj.kind.toLowerCase()}.${group}`;
  try {
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
    console.error("error patching status:", err.stack);
  }
}

// async function publishEvent(obj, type, message) {
//   const namespace = obj.metadata.namespace ?? "default";
//   const id = obj.metadata.uid;

//   fs.writeFileSync("event.json", JSON.stringify({
//     apiVersion: "v1",
//     kind: "Event",
//     metadata: {
//       name: `wing-${id}`,
//       namespace
//     },
//     involvedObject: {
//       kind: obj.kind,
//       namespace,
//       name: obj.metadata.name,
//       uid: obj.metadata.uid,
//       apiVersion: obj.apiVersion,
//     },
//     firstTimestamp: new Date().toISOString(),
//     reportingComponent: "kblocks/operator",
//     reportingInstance: `${obj.apiVersion}/${obj.kind}`,
//     message,
//     type,
//     action: "Apply",
//     reason: "Status"
//   }));

//   try {
//     await exec("kubectl", ["apply", "-f", "event.json"]);
//   } catch (err) {
//     console.error("error creating event:", err.stack);
//   }
// }

function kblockOutputs() {
  return (process.env.KBLOCK_OUTPUTS ?? "").split(",").filter(x => x);
}

exports.exec = exec;
exports.getenv = getenv;
exports.patchStatus = patchStatus;
exports.kblockOutputs = kblockOutputs;