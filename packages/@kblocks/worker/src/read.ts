import { readFileSync, existsSync, rmSync, writeFileSync } from "fs";
import { join } from 'path';
import { RuntimeContext } from "./host.js";
import type { BindingContext } from "@kblocks/api";
import { tempdir } from './util.js';
import { findOwnedObjects } from "./ownedObjects.js";

function resolveReadPath(dir: string): string {
  return join(dir, "read");
}

export function hasReadScript(dir: string): boolean {
  return existsSync(resolveReadPath(dir));
}

export async function execRead(dir: string, host: RuntimeContext, ctx: BindingContext, values: string): Promise<Record<string, any> | undefined> {
  const outputsdir = tempdir();
  try {
    const statusfile = `${outputsdir}/status.json`;
    const contextfile = `${outputsdir}/context.json`;
    writeFileSync(contextfile, JSON.stringify(ctx));

    const script = resolveReadPath(dir);
    if (!existsSync(script)) {
      console.log(`Read script not found,`);
      return undefined;
    }
  
    const ownedObjects = await findOwnedObjects(ctx.object.metadata);
  
    await host.exec(script, [], { cwd: dir, env: {
      KBLOCKS_OBJECT: values,
      KBLOCKS_STATUS: statusfile,
      KBLOCKS_OWNED_OBJECTS: JSON.stringify(ownedObjects),
      KBLOCKS_CONTEXT: contextfile
    } });
    const status = JSON.parse(readFileSync(statusfile, "utf8"));
    return status;
  } finally {
    rmSync(outputsdir, { recursive: true, force: true });
  }
}
