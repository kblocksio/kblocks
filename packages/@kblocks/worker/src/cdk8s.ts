import fs from "fs";
import path from "path";
import type { BindingContext } from "./types/index.js";
import { RuntimeContext } from "./host.js";
import { tempdir } from "./util.js";
import { applyHelm } from "./helm.js";

export async function applyCdk8s(workdir: string, host: RuntimeContext, engine: string, ctx: BindingContext, values: string): Promise<Record<string, any>> {
  const outputdir = tempdir();
  const templatesDir = path.join(outputdir, "templates");

  await host.exec("cdk8s", ["synth", "--app", "\"tsx ./src/index.ts\"", "--output", templatesDir], {
    cwd: workdir,
    env: {
      ...process.env,
      KBLOCKS_VALUES_FILE: values,
      KBLOCKS_OUTPUT_DIR: outputdir,
      KBLOCKS_OPERATOR_IMAGE: process.env.KBLOCKS_OPERATOR_IMAGE,
      KBLOCKS_CONTROL_IMAGE: process.env.KBLOCKS_CONTROL_IMAGE,
      KBLOCKS_WORKER_IMAGE: process.env.KBLOCKS_WORKER_IMAGE,
    }
  });
  return applyHelm(outputdir, host, ctx, values);
}
