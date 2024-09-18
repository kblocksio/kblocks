bring http;
bring cloud;
bring expect;
bring "./api.w" as a;
bring "./clusters.w" as c;
bring "./types.w" as t;
bring "./names.w" as n;
bring "./pool.w" as p;
bring "./bucket.w" as b;

class MockNames impl n.INameGenerator {
  c: cloud.Counter;
  new() {
    this.c = new cloud.Counter();
  }

  pub inflight next(): str {
    return "q8s-{this.c.inc()}";
  }
}

let pool = new p.Pool(
  bucket: new b.CloudBucket(),
);

let api = new a.Api(
  names: new MockNames(),
  clusters: new c.Clusters(),
  user: "dummy",
  pool: pool,
);

let populatePool = inflight () => {
  let var i = 0;

  let addHost = inflight (provider: t.Provider, region: str, size: t.Size) => {
    pool.add(
      provider: provider,
      region: region,
      size: size,
      sshPrivateKey: "<private-key-{i}>",
      instanceId: "i-{i}",
      kubeconfig: "<kubeconfig-{i}>",
      registryPassword: "<password-{i}>",
      publicIp: "1.2.3.{i}",
    );

    i += 1;
  };

  // 1 small, 2 medium, 1 large, 0 xlarge
  addHost(t.Provider.aws, "us-east-1", t.Size.small);   // 0
  addHost(t.Provider.gcp, "america", t.Size.small);     // 1
  addHost(t.Provider.aws, "us-east-1", t.Size.medium);  // 2  
  addHost(t.Provider.aws, "us-east-1", t.Size.medium);  // 3
  addHost(t.Provider.aws, "us-east-1", t.Size.large);   // 4
};

test "create new cluster with defaults" {
  populatePool();

  let response = http.post("{api.url}/clusters");
  expect.equal(response.status, 200);

  let body = t.Cluster.parseJson(response.body);

  expect.equal(body, {
    name: "q8s-0",
    host: {
      provider: "aws",
      region: "us-east-1",
      size: "medium",
      instanceId: "i-2",
      sshPrivateKey: "<private-key-2>",
      kubeconfig: "<kubeconfig-2>",
      registryPassword: "<password-2>",
      publicIp: "1.2.3.2",
    }
  });
}

test "create new cluster with custom options" {
  populatePool();

  let response = http.post("{api.url}/clusters", body: Json.stringify(t.ClusterOptions {
    provider: t.Provider.gcp,
    region: "america",
    size: t.Size.small
  }));

  let body = t.Cluster.parseJson(response.body);

  expect.equal(body, {
    name: "q8s-0",
    host: {
      provider: "gcp",
      region: "america",
      size: "small",
      instanceId: "i-1",
      sshPrivateKey: "<private-key-1>",
      kubeconfig: "<kubeconfig-1>",
      registryPassword: "<password-1>",
      publicIp: "1.2.3.1",
    }
  });
}

test "no host available" {
  populatePool();

  let response = http.post("{api.url}/clusters", body: Json.stringify(t.ClusterOptions {
    size: t.Size.xlarge
  }));

  expect.equal(response.status, 503);
  expect.equal(Json.parse(response.body), {
    status: 503,
    error: #"No available hosts in pool that match the requested attributes: {\"provider\":\"aws\",\"region\":\"us-east-1\",\"size\":\"xlarge\"}"
  });
}

test "list clusters" {
  populatePool();

  http.post("{api.url}/clusters");
  http.post("{api.url}/clusters");
  http.post("{api.url}/clusters");

  let response = http.get("{api.url}/clusters");
  let list = t.ClusterList.parseJson(response.body);
  log(Json.stringify(list));

  expect.equal(list, {
    "clusters":[
      {"host":{"instanceId":"i-2","kubeconfig":"<kubeconfig-2>","provider":"aws","publicIp":"1.2.3.2","region":"us-east-1","registryPassword":"<password-2>","size":"medium","sshPrivateKey":"<private-key-2>"},"name":"q8s-0"},
      {"host":{"instanceId":"i-3","kubeconfig":"<kubeconfig-3>","provider":"aws","publicIp":"1.2.3.3","region":"us-east-1","registryPassword":"<password-3>","size":"medium","sshPrivateKey":"<private-key-3>"},"name":"q8s-1"},
    ]
  });
}

test "delete cluster" {
  populatePool();

  http.post("{api.url}/clusters");

  let r = http.delete("{api.url}/clusters/q8s-0");
  expect.equal(Json.parse(r.body), {
    name: "q8s-0",
    deleted: true,
  });
}

test "delete non existent cluster" {
  populatePool();

  http.post("{api.url}/clusters");

  let r = http.delete("{api.url}/clusters/boom");
  expect.equal(Json.parse(r.body), {
    name: "boom",
    deleted: false,
  });
}

test "get cluster" {
  populatePool();

  http.post("{api.url}/clusters");

  let response = http.get("{api.url}/clusters/q8s-0");
  let c = t.Cluster.parseJson(response.body);
  expect.equal(c, {
    name: "q8s-0",
    host: {
      provider: "aws",
      region: "us-east-1",
      size: "medium",
      instanceId: "i-2",
      sshPrivateKey: "<private-key-2>",
      kubeconfig: "<kubeconfig-2>",
      registryPassword: "<password-2>",
      publicIp: "1.2.3.2",
    }
  });
}

test "get non existing cluster" {
  populatePool();

  let response = http.get("{api.url}/clusters/q8s-0");
  expect.equal(response.status, 404);
  expect.equal(Json.parse(response.body), {
    status: 404,
    error: "Cluster 'q8s-0' not found"
  });
}

