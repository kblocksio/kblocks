import { readFileSync} from "fs";
import { join } from 'path';
import { RuntimeContext } from "./host.js";
import type { BindingContext } from "./api/index.js";
import { tempdir } from './util.js';

export async function applyCustom(dir: string, host: RuntimeContext, ctx: BindingContext, values: string): Promise<Record<string, any>> {
  const outputfile = `${tempdir()}/outputs.json`;
  let script: string;
  switch (ctx.watchEvent) {
    case "Added":
      script = join(dir, "create");
      break;
    case "Modified":
      script = join(dir, "update");
      break;
    case "Deleted":
      script = join(dir, "delete");
      break;
    default:
      script = join(dir, "update");
      break;
  }

  await host.exec(script, [], { cwd: dir, env: { KBLOCKS_OBJECT: values, KBLOCKS_OUTPUTS: outputfile } });
  const outputs = JSON.parse(readFileSync(outputfile, "utf8"));
  return outputs;
}
