import path from "path";
import packageJson from "../package.json";
export interface Options {
  readonly manifest: string;
  readonly path: string;
}

export async function render(opts: Options) {
  const dir = path.resolve(opts.path);

  const tag = `wingcloudbot/kblocks-operator:${packageJson.version === "0.0.0" ? "latest" : packageJson.version}`;
  console.log(tag);
}