import { listProjectTemplates, initCommand, InitOptions } from "../src/init";
import { expect, test } from "vitest";
import os from "os";
import path from "path";
import fs from "fs";

const catalog = listProjectTemplates();

Object.keys(catalog).forEach((name) => {
  test(`${name} template`, async () => {
    const template = catalog[name];
    expect(template).toBeDefined();
    expect(template.name).toBeDefined();
    expect(template.description).toBeDefined();
    expect(template.readme).toBeDefined();
    expect(template.icon).toBeDefined();

    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), name));
    console.log(tmpdir);

    fs.rmdirSync(tmpdir, { recursive: true });

    const options: InitOptions = {
      DIR: tmpdir,
      apiVersion: "v99",
      categories: ["cat1", "cat2"],
      color: "red",
      kind: "Bang",
      group: "bang.com",
      description: "the bang bang description",
      icon: "🔥",
      listKind: "BangList",
      plural: "bangs",
      shortNames: ["b", "ba"],
      TEMPLATE: name,
    };

    if (name === "noop") {
      options.import = true;
      options.kind = "Secret";
      options.group = "core";
      options.plural = "secrets";
      options.apiVersion = "v1";
    }

    await initCommand(options);

    const files = readAllFiles(tmpdir);
    expect(files).toMatchSnapshot();
  });
});


/**
 * Returns a map of all files in a directory and its subdirectories
 * @param dir - The directory to read
 * @returns A map of all files in the directory and its subdirectories
 */
function readAllFiles(basedir: string) {
  const fileMap: Record<string, string> = {};

  const readDir = (dir: string) => {
    const files = fs.readdirSync(path.join(basedir, dir));
    for (const file of files) {
      const relPath = path.join(dir, file);
      const filePath = path.join(basedir, relPath);

      // if the file is a directory, read it recursively
      if (fs.statSync(filePath).isDirectory()) {
        readDir(relPath);
        continue;
      }

      const fileContent = fs.readFileSync(filePath, "utf8");
      fileMap[relPath] = fileContent;
    }
  };

  readDir(".");

  return fileMap;
}
