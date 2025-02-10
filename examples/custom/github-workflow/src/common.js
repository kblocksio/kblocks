const fs = require("fs");

exports.triggerWorkflow = async function(field) {
  console.log(`triggering workflow ${field}`);

  const object = JSON.parse(fs.readFileSync(process.env.KBLOCKS_OBJECT, "utf8"));

  console.log(`object: ${JSON.stringify(object)}`);

  const repo = object.repo;
  const options = object[field];

  if (!options) {
    console.info("no workflow specified, skipping");

    fs.writeFileSync(process.env.KBLOCKS_OUTPUTS, JSON.stringify({
      runid: object.status.runid
    }));

    return;
  }

  const url = `https://api.github.com/repos/${repo}/actions/workflows/${options.workflow}/dispatches`;
  const ref = options.ref ?? "main";

  const body = { 
    ref, 
    inputs: options.inputs 
  };

  console.log(`POST ${url}: ${JSON.stringify(body)}`);

  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  });

  if (!res.ok) {
    console.log(await res.text());
    throw new Error(res.statusText);
  }

  console.log(`workflow ${repo}/${options.workflow} dispatched with inputs ${JSON.stringify(options.inputs)}`);

  let attempts = 10;

  while (attempts > 0) {
    // Get the workflow runs to find the one we just triggered
    const runsUrl = `https://api.github.com/repos/${repo}/actions/workflows/${options.workflow}/runs?branch=${ref}&status=in_progress&event=workflow_dispatch`;
    console.log(`GET ${runsUrl}`);
    const runsRes = await fetch(runsUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json", 
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      }
    });

    if (!runsRes.ok) {
      console.log(await runsRes.text());
      throw new Error(runsRes.statusText);
    }

    const runs = await runsRes.json();

    console.log("runs:", runs);

    if (runs.workflow_runs.length > 0) {
      // Get the most recent run which should be the one we just triggered
      const latestRun = runs.workflow_runs[0];
      
      console.log(`Found workflow run with ID: ${latestRun.id}`);

      fs.writeFileSync(process.env.KBLOCKS_OUTPUTS, JSON.stringify({
        runid: latestRun.id.toString()
      }));

      return;
    }

    console.log("no workflow runs found, trying again in 5 seconds...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts--;
  }

  throw new Error("failed to find workflow run");
}


