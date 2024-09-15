import path from "path";
import { synth as controllerSynth, BindingContext, RuntimeHost, ApiObject } from "@kblocks/controller";
import { readManifest } from "./types";
import yaml from "yaml";
import fs from "fs/promises";
import { buildImage } from "./image";

export interface Options {
  readonly manifest: string;
  readonly path: string;
}

export async function render(opts: Options) {
  const dir = path.resolve(opts.path);

  const tag = await buildImage(dir)
  console.log(tag);
  // const manifest = readManifest(dir);
  // const docs = yaml.parseAllDocuments(await fs.readFile(opts.manifest, "utf-8"));

  // const host: RuntimeHost = {
  //   getenv: (name) => process.env[name]!,
  //   tryGetenv: (name) => process.env[name],
  //   exec: async (cmd, args, opts) => {
  //     console.log(`[skip] $ ${cmd} ${args.join(" ")} ${opts ? JSON.stringify(opts) : ""}`);
  //     return "";
  //   },
  //   chatCompletion: async (input) => {
  //     return undefined;
  //   },
  //   async newSlackThread(channel, initialMessage) {
  //     console.log(`${channel} ${initialMessage}`);
  //     return {
  //       update: async () => {},
  //       post: async () => {},
  //       postBlocks: async () => {},
  //     }
  //   },
  // };

  // for (const d of docs) {
  //   const obj: ApiObject = d.toJSON();
  //   if (obj.kind !== manifest.definition.kind) {
  //     console.warn(`Skipping document with kind '${obj.kind}', expected '${manifest.definition.kind}'`);
  //     continue;
  //   }

  //   obj.metadata.uid = "fake-uid";

  //   const ctx: BindingContext = {
  //     watchEvent: "Modified",
  //     object: obj
  //   };
  
  //   await controllerSynth(dir, host, manifest.engine, ctx)
  // }
}