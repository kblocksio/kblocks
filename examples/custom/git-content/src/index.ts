import fs from "fs";
import { GitContentStatus, reconcileGitContent } from "./git";

if (!process.env.KBLOCKS_OBJECT) {
  throw new Error('KBLOCKS_OBJECT is not set');
}

const object = JSON.parse(fs.readFileSync(process.env.KBLOCKS_OBJECT, "utf8"));
const outputs = process.env.KBLOCKS_OUTPUTS || process.env.KBLOCKS_STATUS;
if (!outputs) {
  throw new Error('neither KBLOCKS_OUTPUTS nor KBLOCKS_STATUS is set');
}

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  throw new Error('GITHUB_TOKEN is not set');
}

const operation = process.env.OPERATION;
if (!operation) {
  throw new Error('OPERATION is not set');
}

const writeOutputs = (status: GitContentStatus) => {
  fs.writeFileSync(
    outputs,
    JSON.stringify(status),
  );
};

reconcileGitContent(object, operation === 'delete', githubToken).then(writeOutputs);
