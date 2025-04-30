import { accessSync, constants, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { simpleGit, SimpleGit } from 'simple-git';

export type ApiObject = {
  apiVersion: string;
  kind: string;
  status?: any;
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp?: string;
    generation?: number;
    resourceVersion?: string;

    uid?: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
    managedFields?: any[];
  };
};

export interface GitContent extends ApiObject {
  name: string;
  owner: string;
  files: {
    path: string;
    content: string;
    readOnly?: boolean;
  }[];
  branch?: string;
  createPullRequest?: boolean;
}

export interface GitContentStatus {
  merged: boolean;
  commit?: string;
  pullrequest?: string;
}

export interface CloneResult {
  git: SimpleGit;
  dir: string;
}

export const reconcileFile = (file: GitContent['files'][number], deletion: boolean, cloneResult: CloneResult) => {
  console.log('reconciling file', file, 'deletion', deletion);
  const filePath = join(cloneResult.dir, file.path);

  try {
    accessSync(filePath, constants.F_OK);
    console.log('file exists');

    if (deletion) {
      rmSync(filePath);
      return true;
    }

    if (!file.readOnly) {
      console.log('file is not read only, and can be overwritten, skipping');
      return false;
    }

    // read the file, update it if it's different
    const fileContent = readFileSync(filePath, 'utf8');
    if (fileContent === file.content) {
      console.log('file content is the same, skipping');
      return false;
    }

    // File is different, update it
    console.log('updating file');
    writeFileSync(filePath, file.content);
    return true;
  } catch (error) {
    if (deletion) {
      console.log('file does not exist, skipping');
      return false;
    }

    // File doesn't exist, create it
    console.log('creating file');
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, file.content);
    return true;
  }
};

export const getOctokit = async (token: string) => {
  const { Octokit } = await import('octokit');
  return new Octokit({ auth: token });
};

const branchName = (name: string) => `gitcontent-block-${name}`;
const baseName = (obj: GitContent) => obj.branch ?? 'main';

export const getPR = async (owner: string, name: string, token: string) => {
  const octokit = await getOctokit(token);

  const { data: existingPRs } = await octokit.rest.pulls.list({
    owner,
    repo: name,
    state: 'open',
  });

  const pr = existingPRs.find((pr) => pr.head.ref === branchName(name));
  if (pr) {
    console.log('PR already exists');
    return pr.html_url;
  }

  return;
};

export const createPR = async (owner: string, name: string, base: string, token: string) => {
  const octokit = await getOctokit(token);

  const currentPR = await getPR(owner, name, token);
  if (currentPR) {
    console.log('PR already exists');
    return currentPR;
  }

  // create a PR using octokit
  console.log('creating PR');
  const pr =await octokit.rest.pulls.create({
    owner,
    repo: name,
    title: `Update ${name}`,
    head: branchName(name),
    base,
    body: 'Update',
  });

  return pr.data.html_url;
};

export const clone = async (owner: string, name: string, token: string) => {
  const gitUrl = `https://oauth2:${token}@github.com/${owner}/${name}.git`;
  const tempDir = mkdtempSync(join(tmpdir(), `git-${owner}-${name}-`));
  const git = simpleGit(tempDir);
  await git.clone(gitUrl);
  return { git, dir: `${tempDir}/${name}` };
};

export const reconcileGitContent = async (obj: GitContent, deletion: boolean, token: string): Promise<GitContentStatus> => {
  const cloneResult = await clone(obj.owner, obj.name, token);
  const base = baseName(obj);
  const branch = obj.createPullRequest ? branchName(obj.name) : base;
  try {
    console.log(`checkout branch ${branch}`);
    if (obj.createPullRequest) {
      await cloneResult.git.cwd(cloneResult.dir).checkout(branch);
      await cloneResult.git.cwd(cloneResult.dir).merge([base, '-m', `Merge ${base} into ${branch}`]);
    }
  } catch (error) {
    console.log(`create branch ${branch}`);
    await cloneResult.git.cwd(cloneResult.dir).checkout(base, ['-b', branch]);
  }

  let updated = false;
  for (const file of obj.files) {
    updated = reconcileFile(file, deletion, cloneResult) || updated;
  }

  if (updated) {
    console.log('pushing changes');
    await cloneResult.git
      .addConfig('user.name', 'Wing Cloud Bot')
      .addConfig('user.email', 'bot@wing.cloud')
      .cwd(cloneResult.dir)
      .add('.')
      .commit(`update ${obj.name}`)
      .push(['-u', 'origin', branch, '--force']);

    if (obj.createPullRequest) {
      const pr = await createPR(obj.owner, obj.name, base, token);
      return {
        merged: false,
        pullrequest: pr,
      };
    } else {
      return {
        merged: true,
        pullrequest: '',
      };
    }
  } else {
    if (obj.createPullRequest) {
      const currentPR = await getPR(obj.owner, obj.name, token);
      return {
        merged: !currentPR,
        pullrequest: currentPR ?? '',
      };
    } else {
      return {
        merged: true,
        pullrequest: '',
      };
    }
  }
};
