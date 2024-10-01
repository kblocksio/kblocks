import path from "path";
import { Octokit } from "@octokit/rest";
import { exec, tempdir } from "./util.js";
import { KConfig } from "./types/types.js";

const DEFAULT_BRANCH = "main";
const token = process.env.GITHUB_TOKEN;

const createOctokit = async (): Promise<Octokit> => {
  // let Octokit;
  // await (async () => {
  //   const { Octokit: OctokitModule } = require('@octokit/rest');
  //   Octokit = OctokitModule;
  // })();
  return new Octokit({ auth: token });
}

export async function getLatestCommit(source: KConfig["manifest"]["source"]) {
  if (!source) {
    throw new Error("No source given");
  }

  const octokit = await createOctokit();

  const [owner, repo] = source.url.split('/').slice(-2);
  const branch = source.branch ?? DEFAULT_BRANCH;

  try {
    const { data } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch,
    });

    return data.commit.sha;
  } catch (error) {
    console.error(`Error fetching latest commit: ${error}`);
    throw error;
  }
}

export async function listenForChanges(kblock: KConfig, onChanges: (commit: string) => void) {
  if (!kblock.manifest.source) {
    console.log("No source found, skipping source listening");
    return "no-source";
  }

  const commit = await getLatestCommit(kblock.manifest.source);
  setTimeout(async () => {
    const newCommit = await getLatestCommit(kblock.manifest.source);
    console.log("Comparing commits", commit, newCommit);
    if (newCommit === commit) {
      listenForChanges(kblock, onChanges);
    } else {
      onChanges(newCommit);
    }
  }, 180000);
  return commit;
}

export async function cloneRepo(source: KConfig["manifest"]["source"]) {
  if (!source) {
    throw new Error("No source given");
  }

  const url = source.url;
  const branch = source.branch ?? DEFAULT_BRANCH;
  const directory = source.directory ?? "";
  const auth = token ? `user:${token}@` : "";
  const targetDir = tempdir();

  await exec(undefined, "git", ["clone", "-b", branch, `https://${auth}${url}`, targetDir]);
  return path.join(targetDir, directory);
}
