const lib = require("./lib");
const fs = require("fs");
const assert = require("assert");

async function testExec() {
  fs.writeFileSync("dummy.txt", "hello");
  const out = await lib.exec("ls");
  assert.equal(out, "dummy.txt");

  try {
    await lib.exec("/bin/sh", ["-c", "echo 'this is stdout'; echo 'this is stderr' >&2; exit 1"], { cwd: "/tmp" });
  } catch (e) {
    assert.equal(e.message, "this is stderr");
  }
}

async function testSynth() {
  const ctx = {
    "binding": "kubernetes",
    "object": {
      "apiVersion": "acme.com/v1",
      "image": "http-echo",
      "kind": "Workload",
      "metadata": {
        "annotations": {
          "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"acme.com/v1\",\"image\":\"http-echo\",\"kind\":\"Workload\",\"metadata\":{\"annotations\":{},\"name\":\"my-workload\"},\"replicas\":2}\n"
        },
        "creationTimestamp": "2024-07-21T21:32:52Z",
        "generation": 1,
        "managedFields": [
          {
            "apiVersion": "acme.com/v1",
            "fieldsType": "FieldsV1",
            "fieldsV1": {
              "f:image": {},
              "f:metadata": {
                "f:annotations": {
                  ".": {},
                  "f:kubectl.kubernetes.io/last-applied-configuration": {}
                }
              },
              "f:replicas": {}
            },
            "manager": "kubectl-client-side-apply",
            "operation": "Update",
            "time": "2024-07-21T21:32:52Z"
          }
        ],
        "name": "my-workload",
        "resourceVersion": "670",
        "uid": "7b73dd36-caa2-4539-bfa8-5d13633f6498"
      },
      "replicas": 2
    },
    "type": "Event",
    "watchEvent": "Added"
  };

  fs.writeFileSync("workload.w", `
    bring k8s;
    pub struct WorkloadSpec {}
    pub class Workload {
      new(props: WorkloadSpec) {
        new k8s.ApiObject(unsafeCast({
          apiVersion: "v1",
          kind: "ConfigMap",
          metadata: {
            name: "my-config",
          },
          data: {
            "key": "value",
          },
        }));
      }
    }
  `);

  await lib.exec("npm", ["install", "@winglibs/k8s"]);
  await lib.synth(ctx);
}

async function test() {
  const dir = fs.mkdtempSync("/tmp/wing-");
  process.chdir(dir);

  await testExec();
  // await testSynth();
}

test().catch(err => console.error(err.stack));
