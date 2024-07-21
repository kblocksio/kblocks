bring fs;
bring expect;

let fixtures = "{@dirname}/fixtures";

let readContext = inflight (file: str) => {
  let j = fs.readJson(file);

  let result = MutArray<Json>[];

  let readObjects = (j: Json) => {
    for v in Json.values(j) {
      if let objects = v.tryGet("objects") {
        readObjects(objects);
      } else {
        if let object = v.tryGet("object") {
          result.push(object);
        }
      }
    }
    
    return result.copy();
  };

  return readObjects(j);
};

test "context1" {
  expect.equal(readContext("{fixtures}/context1.json"), [
    {
      "apiVersion": "acme.com/v1",
      "image": "http-echo",
      "kind": "Workload",
      "metadata": {
        "annotations": {
          "kubectl.kubernetes.io/last-applied-configuration": "\{\"apiVersion\":\"acme.com/v1\",\"image\":\"http-echo\",\"kind\":\"Workload\",\"metadata\":\{\"annotations\":\{},\"name\":\"my-workload\"},\"replicas\":2}\n"
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
    }
  ]);
}

test "context2" {
  expect.equal(readContext("{fixtures}/context2.json"), [
    {
      "apiVersion": "acme.com/v1",
      "image": "http-echo",
      "kind": "Workload",
      "metadata": {
        "annotations": {
          "kubectl.kubernetes.io/last-applied-configuration": "\{\"apiVersion\":\"acme.com/v1\",\"image\":\"http-echo\",\"kind\":\"Workload\",\"metadata\":\{\"annotations\":\{\},\"name\":\"my-workload\"},\"replicas\":2}\n"
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
  ]);
}