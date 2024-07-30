const { resolveReferences } = require("./refs");

async function test() {

  const example = {
    "apiVersion": "acme.com/v1",
    "command": [
        "/bin/sh",
        "-c",
        "while true; do echo \"QUEUE_URL=$QUEUE_URL\"; sleep 1; done"
    ],
    "env": {
        "QUEUE_URL": "${{ kblock://queues.acme.com/my-queue/queueUrl }}"
    },
    "image": "busybox:1.28",
    "kind": "Workload",
    "metadata": {
        "annotations": {
            "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"acme.com/v1\",\"command\":[\"/bin/sh\",\"-c\",\"while true; do echo \\\"QUEUE_URL=$QUEUE_URL\\\"; sleep 1; done\"],\"env\":{\"QUEUE_URL\":\"${{ kblock://queues.acme.com/my-queue/queueUrl }}\"},\"image\":\"busybox:1.28\",\"kind\":\"Workload\",\"metadata\":{\"annotations\":{},\"name\":\"my-queue-producer\",\"namespace\":\"default\"}}\n"
        },
        "creationTimestamp": "2024-07-30T14:35:18Z",
        "generation": 1,
        "name": "my-queue-producer",
        "namespace": "default",
        "resourceVersion": "3692",
        "uid": "6a3fb426-f4de-442f-b50f-f9b2adacefcf"
    },
    "status": {
        "conditions": [
            {
                "lastProbeTime": "2024-07-30T14:55:12.273Z",
                "lastTransitionTime": "2024-07-30T14:55:15.106Z",
                "status": true,
                "type": "Ready"
            }
        ]
    }
  };

  console.log(await resolveReferences(example));
}

test().catch(err => {
  console.error(err.stack);
  process.exit(1);
});