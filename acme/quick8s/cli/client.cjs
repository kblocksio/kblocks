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
  await req("POST", "/clusters", JSON.stringify(attrs));
  
  console.log();
}

newCluster().catch(e => {
  console.error(e);
  process.exit(1);
})