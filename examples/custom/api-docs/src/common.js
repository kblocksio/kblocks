const { exec } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const openai = require("openai");

const object = JSON.parse(fs.readFileSync(process.env.KBLOCKS_OBJECT, "utf8"));
const outputs = process.env.KBLOCKS_OUTPUTS || process.env.KBLOCKS_STATUS;
const repoUrl = object.repository;
const directory = object.directory || ".";

async function updateOpenApiSpec(deleteSpec = false) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kblocks-apidocs-"));

  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error("GITHUB_TOKEN is not set");
    }

    console.log(`Cloning ${repoUrl} into ${tempDir}`);
    await executeCommand(`git clone https://${githubToken}@github.com/${repoUrl} ${tempDir}`, tempDir);

    if (deleteSpec) {
      console.log(`Deleting spec`);
      await deleteAndPushSpec(tempDir);
      writeOutputs(repoUrl);
      return;
    }

    const subdir = path.join(tempDir, directory);
    console.log(`Reading files recursively ${subdir}`);
    const fileMap = readFilesRecursively(subdir);

    console.log("Sending to OpenAI");
    const openaiResponse = await chatCompletion(fileMap);

    console.log("Committing and pushing");
    const spec = sortObjectFields(openaiResponse);
    await commitAndPushSpec(tempDir, spec);

    writeOutputs(repoUrl, spec);

    return openaiResponse;
  } catch (error) {
    console.error("Error processing api docs", error);
    throw error;
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
}

function writeOutputs(repoUrl, spec = undefined) {
  fs.writeFileSync(outputs, JSON.stringify({
    url: `https://github.com/${repoUrl}/blob/main/openapi.json`,
    spec,
  }));
}

function executeCommand(command, tempDir) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: tempDir }, (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing command: ${error}\n${stderr.trim()}`);
      } else {
        console.log(stdout.trim());
        resolve(stdout.trim());
      }
    });
  });
}

function readFilesRecursively(dir, fileMap = {}) {
  const ignoredDirs = [".git", "node_modules", "dist"];
  if (ignoredDirs.some((ignored) => dir.endsWith(ignored))) {
    return fileMap;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      readFilesRecursively(fullPath, fileMap);
    } else {
      const content = fs.readFileSync(fullPath, "utf-8");
      fileMap[fullPath] = content;
    }
  }

  return fileMap;
}

async function chatCompletion(input) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const prompt = `
Given the following map of file names and their contents from a GitHub repository, 
please create an OpenAPI specification that describes the API represented by these files. 
Please generate a comprehensive and accurate OpenAPI specification based on this information.
The output should only be a valid OpenAPI specification in JSON format.
Do not wrap the output in \`\`\`json tags. It should be a plain, valid JSON string.
The file map is:\n\n
`;

  const client = new openai.OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    // max_tokens: 1024,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(input) },
    ],
  });

  return response.choices?.[0]?.message?.content ?? undefined;
}


async function commitAndPushSpec(tempDir, spec) {
  const openApiFilePath = path.join(tempDir, directory, "openapi.json");

  // reset and pull latest
  await executeCommand(`git reset --hard`, tempDir);
  await executeCommand(`git pull`, tempDir);

  if (fs.existsSync(openApiFilePath)) {
    const existingSpec = fs.readFileSync(openApiFilePath, "utf-8");
    if (existingSpec === spec) {
      return;
    }
  }

  fs.writeFileSync(openApiFilePath, spec);

  await executeCommand(`git add ${openApiFilePath}`, tempDir);
  await executeCommand(`git commit -m "Update OpenAPI spec"`, tempDir);
  await executeCommand(`git push`, tempDir);
}

async function deleteAndPushSpec(tempDir) {
  const openApiFilePath = path.join(tempDir, directory, "openapi.json");

  if (!fs.existsSync(openApiFilePath)) {
    return;
  }

  fs.unlinkSync(openApiFilePath);

  await executeCommand(`git commit -am "Delete OpenAPI spec"`, tempDir);
  await executeCommand(`git push`, tempDir);
}

function sortObjectFields(object) {
  // take an object and return a new object with the fields sorted, recursively
  if (typeof object !== "object" || object === null) {
    return object;
  }

  if (Array.isArray(object)) {
    return object.sort().map(sortObjectFields);
  }

  return Object.keys(object).sort().reduce((acc, key) => {
    acc[key] = sortObjectFields(object[key]);
    return acc;
  }, {});
}

exports.updateOpenApiSpec = updateOpenApiSpec;
