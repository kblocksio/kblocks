import { test, expect } from "vitest";
import { resolveReferencesInternal } from "./refs.js";
import type { ApiObject } from "@kblocks/api";

test("test1", async () => {
  const actual = await testResolveReference({
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
          "status": "True",
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

  expect(actual.env).toEqual(expected.env);
});

test("test2", async () => {
  const actual = await testResolveReference({
    apiVersion: 'acme.com/v1',
    metadata: {
      annotations: {
        "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"acme.com/v1\",\"command\":[\"/bin/sh\",\"-c\",\"while true; do echo \\\"QUEUE_URL=$QUEUE_URL\\\"; sleep 1; done\"],\"env\":{\"QUEUE_URL\":\"${ref://queues.acme.com/my-queue/queueUrl}\"},\"image\":\"busybox:1.28\",\"kind\":\"Workload\",\"metadata\":{\"annotations\":{},\"name\":\"my-queue-producer\",\"namespace\":\"default\"}}\n"
      },
      creationTimestamp: "2024-07-30T14:35:18Z",
      generation: 1,
      name: "my-queue-producer",
      namespace: "default",
      resourceVersion: "3692",
      uid: "6a3fb426-f4de-442f-b50f-f9b2adacefcf"
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

  expect(actual.env).toEqual(expected.env);
  expect(actual.envSecrets).toEqual(expected.envSecrets);
});

async function testResolveReference(input: ApiObject & { [key: string]: any }) {
  return await resolveReferencesInternal(input, async o => {
    delete (o as any).ref;
    return `<${JSON.stringify(o)}>`;
  });
}
