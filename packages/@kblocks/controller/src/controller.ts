import fs from "fs";
import path from "path";
import * as tar from "tar";
import { synth } from "./synth";
import { RuntimeHost } from "./host";
import { exec, getenv, tempdir, tryGetenv } from "./util";
import { newSlackThread } from "./slack";
import { chatCompletion } from "./ai";

const kblock = JSON.parse(fs.readFileSync("/kconfig/kblock.json", "utf8"));
if (!kblock.config) {
  throw new Error("kblock.json must contain a 'config' field");
}

if (!kblock.engine) {
  throw new Error("kblock.json must contain an 'engine' field");
}

async function extractArchive(dir: string) {
  const encodedTgz = fs.readFileSync(path.join(dir, "archive.tgz"), "utf8");
  const decodedTgz = Buffer.from(encodedTgz, "base64");
  const targetDir = tempdir();
  const tempFile = path.join(targetDir, "archive.tgz");
  
  fs.writeFileSync(tempFile, decodedTgz);

  await tar.x({
    cwd: targetDir,
    file: tempFile,
  });

  fs.unlinkSync(tempFile);

  return targetDir;
}

async function installDependencies(dir: string) {
  if (fs.existsSync(path.join(dir, "package.json"))) {
    if (fs.existsSync(path.join(dir, "node_modules"))) {
      return;
    }
  
    await exec("npm", ["install", "--production"], { cwd: dir });
  }

  if (fs.existsSync(path.join(dir, "Chart.yaml"))) {
    if (fs.existsSync(path.join(dir, "__helm"))) {
      return;
    }

    await exec("helm", ["dependency", "update"], { cwd: dir });
    fs.writeFileSync(path.join(dir, "__helm"), "{}");
  }
}

async function main() {
  if (process.argv[2] === "--config") {
    process.stdout.write(JSON.stringify(kblock.config, null, 2));
    return process.exit(0);
  }

  if (!process.env.BINDING_CONTEXT_PATH) {
    throw new Error("BINDING_CONTEXT_PATH is not set");
  }

  const mountdir = "/kblock";
  const context = JSON.parse(fs.readFileSync(process.env.BINDING_CONTEXT_PATH, "utf8"));

  const sourcedir = await extractArchive(mountdir);
  await installDependencies(sourcedir);

  const host: RuntimeHost = {
    getenv,
    tryGetenv,
    exec,
    newSlackThread,
    chatCompletion,
  };

  for (const ctx of context) {
    if ("objects" in ctx) {
      for (const ctx2 of ctx.objects) {
        // copy from parent so we can reason about it.
        ctx2.type = ctx.type;
        ctx2.watchEvent = ctx.watchEvent;
        await synth(sourcedir, host, kblock.engine, ctx2);
      }
    } else if ("object" in ctx) {
      await synth(sourcedir, host, kblock.engine, ctx);
    }
  }
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});
