const fs = require('fs');
const path = require('path');
const os = require('os');

const exampleGitContent = {
  name: "queue-to-bucket",
  owner: "eladcon",
  files: [
    {
      path: "README.md",
      content: "# Queue to Bucket\nThis is an example of a README not 1.",
      readOnly: false
    }
  ],
  createPullRequest: true
};

const d = fs.mkdtempSync(path.join(os.tmpdir(), 'test-git-content'));
const outputsFile = path.join(d, 'outputs.json');
fs.writeFileSync(path.join(d, 'object.json'), JSON.stringify(exampleGitContent, null, 2));
process.env.KBLOCKS_OBJECT = path.join(d, 'object.json');
process.env.KBLOCKS_OUTPUTS = outputsFile;
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
process.env.OPERATION = 'create';

require('./commands.cjs').create();
console.log(fs.readFileSync(outputsFile, 'utf8'));
