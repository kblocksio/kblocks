const { resolveReferencesInternal } = require("./refs");
const assert = require("assert");

async function test(input) {
  return await resolveReferencesInternal(input, async o => {
    delete o.ref;
    return `<${JSON.stringify(o)}>`;
  });
}

async function test1() {
  const actual = await test({
    "apiVersion": "acme.com/v1",
    "command": [
      "/bin/sh",
      "-c",
      "while true; do echo \"QUEUE_URL=$QUEUE_URL\"; sleep 1; done"
    ],
    "env": {
      "QUEUE_URL": "${ref://queues.acme.com/my-queue/queueUrl}",
      "MESSAGE": "This is my ${ref://queues.acme.com/my-queue/hello} queue ${ref://queues.acme.com/my-queue/world} <-- world"
    },
    "image": "busybox:1.28",
    "kind": "Workload",
    "metadata": {
      "annotations": {
        "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"acme.com/v1\",\"command\":[\"/bin/sh\",\"-c\",\"while true; do echo \\\"QUEUE_URL=$QUEUE_URL\\\"; sleep 1; done\"],\"env\":{\"QUEUE_URL\":\"${ref://queues.acme.com/my-queue/queueUrl}\"},\"image\":\"busybox:1.28\",\"kind\":\"Workload\",\"metadata\":{\"annotations\":{},\"name\":\"my-queue-producer\",\"namespace\":\"default\"}}\n"
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
  });

  const expected = {
    env: {
      QUEUE_URL: '<{"apiGroup":"queues.acme.com","name":"my-queue","namespace":"default","field":"queueUrl"}>',
      MESSAGE: 'This is my <{"apiGroup":"queues.acme.com","name":"my-queue","namespace":"default","field":"hello"}> queue <{"apiGroup":"queues.acme.com","name":"my-queue","namespace":"default","field":"world"}> <-- world'
    }
  };

  assert.deepEqual(actual.env, expected.env, JSON.stringify(actual.env));
}

async function test2() {
  const actual = await test({
    apiVersion: 'acme.com/v1',
    "metadata": {
      "annotations": {
        "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"acme.com/v1\",\"command\":[\"/bin/sh\",\"-c\",\"while true; do echo \\\"QUEUE_URL=$QUEUE_URL\\\"; sleep 1; done\"],\"env\":{\"QUEUE_URL\":\"${ref://queues.acme.com/my-queue/queueUrl}\"},\"image\":\"busybox:1.28\",\"kind\":\"Workload\",\"metadata\":{\"annotations\":{},\"name\":\"my-queue-producer\",\"namespace\":\"default\"}}\n"
      },
      "creationTimestamp": "2024-07-30T14:35:18Z",
      "generation": 1,
      "name": "my-queue-producer",
      "namespace": "default",
      "resourceVersion": "3692",
      "uid": "6a3fb426-f4de-442f-b50f-f9b2adacefcf"
    },
    env: {
      FOO: 'bar',
      POSTGRES_DB: '${ref://postgres.acme.com/voting-database/database}',
      POSTGRES_HOST: '${ref://postgres.acme.com/voting-database/host}',
      POSTGRES_PORT: '${ref://postgres.acme.com/voting-database/port}',
      POSTGRES_USER: '${ref://postgres.acme.com/voting-database/user}'
    },
    envSecrets: {
      POSTGRES_PASSWORD: {
        key: '${ref://postgres.acme.com/voting-database/passwordKey}',
        name: '${ref://postgres.acme.com/voting-database/passwordSecret}'
      }
    },
    image: 'wingcloudbot/voting-app-be:sha-ff1ea52',
    kind: 'Workload',
    port: 3000,
    replicas: 2,
    rewrite: '/$2',
    route: '/api(/|$)(.*)'
  });

  const expected = {
    env: {
      FOO: 'bar',
      POSTGRES_DB: '<{"apiGroup":"postgres.acme.com","name":"voting-database","namespace":"default","field":"database"}>',
      POSTGRES_HOST: '<{"apiGroup":"postgres.acme.com","name":"voting-database","namespace":"default","field":"host"}>',
      POSTGRES_PORT: '<{"apiGroup":"postgres.acme.com","name":"voting-database","namespace":"default","field":"port"}>',
      POSTGRES_USER: '<{"apiGroup":"postgres.acme.com","name":"voting-database","namespace":"default","field":"user"}>'
    },
    envSecrets: {
      POSTGRES_PASSWORD: {
        key: '<{"apiGroup":"postgres.acme.com","name":"voting-database","namespace":"default","field":"passwordKey"}>',
        name: '<{"apiGroup":"postgres.acme.com","name":"voting-database","namespace":"default","field":"passwordSecret"}>'
      }
    }
  };

  assert.deepEqual(actual.env, expected.env);
  assert.deepEqual(actual.envSecrets, expected.envSecrets);
}

async function main() {
  await test1();
  await test2();
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});