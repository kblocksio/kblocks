import * as child_process from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export function exec(command: string, args: string[], options: child_process.SpawnOptions = {}): Promise<string> {
  args = args || [];
  options = options || {};

  return new Promise((resolve, reject) => {
    console.log("$", command, args.join(" "));

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

export function tempdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kblocks-"));
}