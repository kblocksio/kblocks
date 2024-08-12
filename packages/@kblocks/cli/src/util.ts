import fs from "fs/promises";
import crypto from "crypto";

export async function readAll(base: string, filter?: (path: string) => boolean): Promise<{ [path: string]: string }> {
  const output: Record<string, string> = {};

  const readDir = async (dir: string) => {

    for (const f of await fs.readdir(`${base}/${dir}`)) {
      const relpath = `${dir}/${f}`;

      // skip files that don't match the filter
      if (filter && !filter(relpath)) {
        continue;
      }

      const fullpath = `${base}/${relpath}`;
      const stat = await fs.stat(fullpath);
      if (stat.isDirectory()) {
        await readAll(fullpath);
      } else {
        const c = await fs.readFile(fullpath, "utf8");
        output[relpath] = c;
      }
    }
  
  };

  await readDir(".");

  return output;
}

/**
 * Returns a crypto hash of all the files in a directory (recursively)
 * @param dir The base directory
 * @param exclude A list of files to exclude
 */
export async function hashAll(dirs: string[], exclude?: string[]) {
  const hash = crypto.createHash("sha256");
  for (const dir of dirs) {
    const files = await readAll(dir, (path) => !exclude?.includes(path));
    for (const [path, content] of Object.entries(files).sort()) {
      hash.update(`${dir}/${path}`);
      hash.update(content);
    }
  }
  
  return hash.digest("hex");
}
