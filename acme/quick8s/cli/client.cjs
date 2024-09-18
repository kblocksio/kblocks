const baseurl = process.env.QUICK8S_URL ?? "https://api.quick8s.sh";

async function req(method, pathname, body = undefined) {
  const url = `${baseurl}${pathname}`;
  const resp = await fetch(url, { 
    method, 
    body, 
    headers: {
      "content-type": "application/json"
    }
  });

  if (resp.status !== 200) {
    throw new Error(await resp.text());
  }

  return await resp.json();
}

async function newCluster(attrs = {}) {
  return req("POST", "/clusters", JSON.stringify(attrs));
}

async function deleteCluster(name) {
  return req("DELETE", `/clusters/${name}`);
}

async function listClusters() {
  return req("GET", "/clusters");
}

async function getCluster(name) {
  return req("GET", `/clusters/${name}`);
}

module.exports = {
  newCluster,
  deleteCluster,
  listClusters,
  getCluster,
};