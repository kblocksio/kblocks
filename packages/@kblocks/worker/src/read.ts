import { readFileSync, existsSync } from "fs";
import { join } from 'path';
import { RuntimeContext } from "./host.js";
import type { BindingContext } from "./api/index.js";
import { tempdir } from './util.js';
import { findOwnedObjects } from "./ownedObjects.js";

function resolveReadPath(dir: string): string {
  return join(dir, "read");
}

export function hasReadScript(dir: string): boolean {
  return existsSync(resolveReadPath(dir));
}

export async function execRead(dir: string, host: RuntimeContext, ctx: BindingContext, values: string): Promise<Record<string, any> | undefined> {
  const statusfile = `${tempdir()}/status.json`;
  const script = resolveReadPath(dir);
  if (!existsSync(script)) {
    console.log(`Read script not found,`);
    return undefined;
  }

  const ownedObjects = await findOwnedObjects(ctx.object.metadata);

  await host.exec(script, [], { cwd: dir, env: { KBLOCKS_OBJECT: values, KBLOCKS_STATUS: statusfile, KBLOCKS_OWNED_OBJECTS: JSON.stringify(ownedObjects) } });
  const status = JSON.parse(readFileSync(statusfile, "utf8"));
  return status;
}
