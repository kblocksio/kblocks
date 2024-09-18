bring http;
bring cloud;
bring expect;
bring fs;
bring "./api.w" as a;
bring "./clusters.w" as c;
bring "./types.w" as t;
bring "./names" as names;
bring "./pool.w" as p;
bring "./bucket.w" as b;
bring "./dns" as d;

let fixture = fs.readJson("{@dirname}/fixtures/host.json");
let kubeconfigBase64 = fixture.get("kubeconfig").asStr();

let expectedKubeConfig = inflight (name: str) => {
  return {
    "apiVersion": "v1",
    "clusters": [
      {
        "cluster": {
          "certificate-authority-data": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJRVBDaGhXME5GRzh3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBNU1UZ3dOVE15TVRSYUZ3MHpOREE1TVRZd05UTTNNVFJhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUUM0YlRvV0NFNnMycnFubkhqKzZvWEVzU0FrMGhjNVRBTFN4UHc3SGV5T0JPeW5xZERvRHRvSzRQNkIKVW4yRDhmbjZaQThWZXFGRzBvcWM0OFlGMzl0anpRSUVUWjFYRnNGL0dUSkFOVVVwOEhoMXo1cTJwTnJNbjgvcQpzRlRyRkROUkRoRlNyVFplb1R5OGd2cWx1RVpRSC9aWTVsQzBwb2xxMEFrbWdnN2xET2xoWjNtaUFqYytIRnA1CjMvMkVKTDNNeXZMZVpoTFNHdVJ6cnhDTWp4UENjVld6RlV0dGYxTU9BbTNvSTl5a3hDcjM1WW1GSFNqWGZPV3oKdTRiczd1RTA5MnVNbDIybnVFUmZ0ZFdxeXZXMVdrejZWc0Q1cjJWTDRreHpRTTNhWmtwT3FSdXJ6bHVQYkJ1YQpZdVpONE82dUhWYXR2blQ2eW1qSlNxelkzMWVIQWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJTUUI5MHZXcUtRN2ZPT2pHZmFRWEN2b3lFZllUQVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQzBRcU1zRjJrSApxNngxajFrTERSWTNMaTFYTHp6ZHJVRXhOaGwvaGYzMWVLeG1yU2QyVnZTcVJJWDFrZU9oWGNhSG9JU2prY1dmCkpRdUxsL1ZoRzBvd1BDODc0WEdOUE5qVEg4Y0ZHUUNOZkRyRjNxTXlxL0NpTWlxdVB1UEhqSkdDekZBSFhWUTkKbTVaVjUzZmJ3cTRmNEw0U0ZmRGRQSWo0ZXdaaW1lMklsQmhNMkp4L0lhMnA1aTQxcnUrYmY5ajdZckozbERWZQptUTVnbHlqTkJZRGd2d1gwK0Q0dlZ0TTd3OG1PSi9LYnU5MjRnWHNuN3p5U3dQNzc2MkZVbWdPTWxIYU9BbU9XCmNXWjdZVDZTZFVTVXpHQlZyQnR2cWRWdForN1dBMzROZ203Mm1DZ2s2YmpyNFE2MHIvTlovcXM2S1g1OHUwenMKY09IbllhczcyalFRCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
          "server": "https://{name}.dummy.com:7443"
        },
        "name": name
      }
    ],
    "contexts": [
      {
        "name": name,
        "context": {
          "cluster": name,
          "user": name
        }
      }
    ],
    "current-context": name,
    "kind": "Config",
    "preferences": {},
    "users": [
      {
        "name": name,
        "user": {
          "client-certificate-data": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURLVENDQWhHZ0F3SUJBZ0lJYnlHa2xLaHo0bVF3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBNU1UZ3dOVE15TVRSYUZ3MHlOVEE1TVRnd05UTTNNVGxhTUR3eApIekFkQmdOVkJBb1RGbXQxWW1WaFpHMDZZMngxYzNSbGNpMWhaRzFwYm5NeEdUQVhCZ05WQkFNVEVHdDFZbVZ5CmJtVjBaWE10WVdSdGFXNHdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCRHdBd2dnRUtBb0lCQVFERWczMUoKNHJPQitSaGh6Mkg3TklielRNTFBDOHMyOVhTWmpPcVY3NXBmT3BzMC93bUEyakhRbFdsVExIbEU4bldrRWxXaAppb3YrQU5wTmlwTXNKd3VXV1ZvTXBWUnZaUzN1eTBQWDFPR01yREdOcS9HUzQybStzcElpZHM1MmMxUUFWbThCCk1kWGdmZFo4d2ZVUUhpazd6OVExdVhUMzBtSW54RUlVc2hNVm1MSU42KzNTdjU1RGZkWDJnTWNvVE8vTyttWXoKOUlXZlZNNng3U25LK0FjOHcycGJoTGw0RDEzY0tXME5hR3RtS0NLTEYvaCtrcWorclArZkYrWnRERHZiaGpURQpLdXplY215bjhLNnNEQnB1WlVvWUM0REx4M2lZWi9CMjZKRHFMT01EUWpMT0dGWWlPbmRVdnBYeHJYYWEvWm1sCmI1VFd6OSt3VHltK1lTMGRBZ01CQUFHalZqQlVNQTRHQTFVZER3RUIvd1FFQXdJRm9EQVRCZ05WSFNVRUREQUsKQmdnckJnRUZCUWNEQWpBTUJnTlZIUk1CQWY4RUFqQUFNQjhHQTFVZEl3UVlNQmFBRkpBSDNTOWFvcER0ODQ2TQpaOXBCY0sraklSOWhNQTBHQ1NxR1NJYjNEUUVCQ3dVQUE0SUJBUUJOLzlGVEVXV3pucFNCWFhDNnYzRmZJNVhpClJSc0RGNUpZUE1Wem5zTlI3czJTeWNUYitkN201M0VFQjJSM1pDTGpOdTU2TEtEUzNlSE9Bc1pOb3FlRU9tNXYKdVUwVnJNZTE4eXpjVjhiZXk2eGU4VFVnWXZGbGM5M1hLTW85SjhqN1NvS0Y4LzJ0ZnZBckVFVWFHb0ZBc2hIUQpleUoyYWNVUzlEWmN5Wm80K3JNTDNwVzllUmd3KzZkclNtQUNsRSs1bmVxUXNBejFqRFVFM0U5R1EySEl1R0paClRNTXFYSk1YN1Y2ZEtQRzUrUkdwaFZDcHorQjVuSWZmZmhPcldnWjVNMnl4SmxGRG4yS2xFQUxMT0syRVEzS24KbnM3blZuTksvdzlGRU9hS2xSNTdVMlZ3dE5rWW5Zd3dTTVZYUFhRWENvZUs1ZkhtcGEyM3pSU3k0d2JkCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
          "client-key-data": "LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBeElOOVNlS3pnZmtZWWM5aCt6U0c4MHpDend2TE52VjBtWXpxbGUrYVh6cWJOUDhKCmdOb3gwSlZwVXl4NVJQSjFwQkpWb1lxTC9nRGFUWXFUTENjTGxsbGFES1ZVYjJVdDdzdEQxOVRoakt3eGphdngKa3VOcHZyS1NJbmJPZG5OVUFGWnZBVEhWNEgzV2ZNSDFFQjRwTzgvVU5ibDA5OUppSjhSQ0ZMSVRGWml5RGV2dAowcitlUTMzVjlvREhLRXp2enZwbU0vU0ZuMVRPc2UwcHl2Z0hQTU5xVzRTNWVBOWQzQ2x0RFdoclppZ2lpeGY0CmZwS28vcXovbnhmbWJRdzcyNFkweENyczNuSnNwL0N1ckF3YWJtVktHQXVBeThkNG1HZndkdWlRNml6akEwSXkKemhoV0lqcDNWTDZWOGExMm12MlpwVytVMXMvZnNFOHB2bUV0SFFJREFRQUJBb0lCQUJsWXNGOUlTMGozWFFxNAptZld4dDdwSDYxU1RPOW5SM1FFMUtNakFCOVJDbGVSSEJPM0d0dWdsYlZsYUFpWS9jNmIrNm1hVW5TdmM1a3RjCkZWRjdrOFlIcmxLMVBHZkYwQi9kdmRsbnp0TzdIZ1VjNldLOXpGVFphWG5pZ3d6S0lVcU4yM0YzQVJRY2h2NisKY2FKcmtYdnllWGVZZlJxOTJ3VXdEaW5uTWdqMTJCcEdyUlVDVmFZVDdxdGVPOUlxTXZwNlcrem1MVk8zQnNkZAozVy9YSkNYa0VMTFppT1NoNXlHZmRDQm0wMk1kVjlLQWNUVnk3MFRHSk1IN2hOL0N0UlZWOFhVK21GTW1zdDJ3ClU3WnowUjVPR1JoVVVuRVQ0THRVUWxSTHdYbUtwOFdBc1EvQnFSNUptdmFqV2JXVC8wdHFOQ2dUVFFtSjdlTWQKRzUvYkNRRUNnWUVBMjh6KzFGb1g2d1VId0FJUXI0V0NjendVWTBNcXN2UllHN2Z0YkhIdmpsL2lxNzNEY0FTYgpDKzlnYWVJWmdjbmdVRG5reEpTTS9TV3c2K3RrMk9sdUdRZmJMbmw3dDB1T1NLeHNTQThZaytwK2NHNk9NUHdQCkFhNVRFS2V2K292MnVtdEhtd2h6cklLTmUwMzNIQ21nSGZPYnU5MFpyNGdIaXduM0RjTUlBMTBDZ1lFQTVPQ3YKMG1iVnRxOGFzV1l4RURRNExNaEg2VGlBR2lUZnUwc0Z2ZlpnZ3VMZUxzdDZmUFg5UnNPY0t2QWFNVXdRUUJNNgppbUdrMjd5M1dBMDJ2SjA0cDhieWtISmJOaUJwcXNVUENLemxQbTdZMks0VWlFQXdsTDByUStwTEdUaVFMOHYyCjRZaHlCNW1ZeHRhbGk3NGdwRXNtS0RjRGhFODFJZFIvc3lxSzlNRUNnWUVBcUlmVDFHcUg4RkhaRVdZRCtURDcKUnZRSUJkd1lQMEtPMUNJQXo2ZkVzSHZneHlJbldocU43MmJKbkNZYXZLTlhkT3dPOXBPWVR2bTVZQXNMTmk0MQpsc2VwVFVja2p2UkYwbjh5UDBZajZEWmlZRDdFazlhUWd3OXc3VkpGNG11eThGa1ZmRS9Nc2JjZ1dDejlqZ0IwCm5zS001RXl4UngrYitRWFpBaHBLYUprQ2dZRUFtYzlOR080MnJPQWI1aCt3MVJ6aXEyV2t2ZHhVYWoxaGhUSXoKbDZkYzBGaTV5MlMrMmY5TnlDSm9ib3FRYjVTWVR4Y2MvaVlFYmc3eWYxL1I2d3NWS2RzTzQzZVdTRmViNjBFbQppMFAxZ3ZGbkZLWlg4Z0NCSlZQRElZN3dEUER3Sk03RENHbHppQnYyaVpseUF1a3djbmgyR2d4dWRwbnNNT0huCk4zWmRqNEVDZ1lCeWgvcXBxNWtTaGQzSndpNGJWMElLUCtiVzkwRDJaUkFSYXJpeU1udW11d0VNcmtqck8vOEgKalpxZ3diSGhYdnU0WTZxREQ5UGlNRjhpZ2tBTjNiUGE5Sk1HUzl5NzZ3VURhek1zTnBEbS9HT2VkQUVSaFJDUQorUGd1WHkwNlBlR0dWdmdlMExoUjR1V2dvTkJGTStWSGlzallUa0NqV1FRL21tMTZNRVVjc2c9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo="
        }
      }
    ]
  };
};

class MockNames impl names.INameGenerator {
  c: cloud.Counter;
  new() {
    this.c = new cloud.Counter();
  }

  pub inflight next(): str {
    return "q8s-{this.c.inc()}";
  }
}

let pool = new p.Pool(bucket: new b.CloudBucket());
let dns = new d.DnsSimulation();

let api = new a.Api(
  names: new MockNames(),
  clusters: new c.Clusters(),
  dns: dns,
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
      kubeconfig: kubeconfigBase64,
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
    provider: "aws",
    region: "us-east-1",
    size: "medium",
    sshPrivateKey: "<private-key-2>",
    registryPassword: "<password-2>",
    publicIp: "1.2.3.2",
    hostname: "q8s-0.dummy.com",
    kubeconfig: expectedKubeConfig("q8s-0"),
  });

  expect.equal(dns.tryResolve("q8s-0.dummy.com"), "1.2.3.2");
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
    hostname: "q8s-0.dummy.com",
    kubeconfig: expectedKubeConfig("q8s-0"),
    provider: "gcp",
    region: "america",
    size: "small",
    sshPrivateKey: "<private-key-1>",
    registryPassword: "<password-1>",
    publicIp: "1.2.3.1",
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

  expect.equal(list, {
    "clusters":[
      "q8s-0",
      "q8s-1"
    ]
  });
}

test "delete cluster" {
  populatePool();

  http.post("{api.url}/clusters");

  expect.equal(dns.tryResolve("q8s-0.dummy.com"), "1.2.3.2");

  let r = http.delete("{api.url}/clusters/q8s-0");
  expect.equal(Json.parse(r.body), {
    name: "q8s-0",
    deleted: true,
  });

  expect.nil(dns.tryResolve("q8s-0.dummy.com"));
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
    hostname: "q8s-0.dummy.com",
    kubeconfig: expectedKubeConfig("q8s-0"),
    provider: "aws",
    region: "us-east-1",
    size: "medium",
    sshPrivateKey: "<private-key-2>",
    registryPassword: "<password-2>",
    publicIp: "1.2.3.2",
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

