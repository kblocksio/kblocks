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

exports.exec = exec;