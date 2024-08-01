import {describe, test, vi, expect} from "vitest";
import {resolveReferences} from "./refs";

vi.mock("./util", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    publishEvent: vi.fn(),
    exec: vi.fn().mockImplementation((cmd, args) => {
      return Promise.resolve(args[1].replace("/", "_"));
    }),
  };
});

describe("resolveReferences", () => {
  test("single reference is resolved", async (done) => {
    const example = {
      apiVersion: "acme.com/v1",
      command: ["/bin/sh", "-c", 'while true; do echo "QUEUE_URL=$QUEUE_URL"; sleep 1; done'],
      env: {
        QUEUE_URL: "${{ kblock://queues.acme.com/my-queue/queueUrl }}",
      },
      image: "busybox:1.28",
      kind: "Workload",
      metadata: {
        annotations: {
          "kubectl.kubernetes.io/last-applied-configuration": '{"apiVersion":"acme.com/v1","command":["/bin/sh","-c","while true; do echo \\"QUEUE_URL=$QUEUE_URL\\"; sleep 1; done"],"env":{"QUEUE_URL":"${{ kblock://queues.acme.com/my-queue/queueUrl }}"},"image":"busybox:1.28","kind":"Workload","metadata":{"annotations":{},"name":"my-queue-producer","namespace":"default"}}\n',
        },
        creationTimestamp: "2024-07-30T14:35:18Z",
        generation: 1,
        name: "my-queue-producer",
        namespace: "default",
        resourceVersion: "3692",
        uid: "6a3fb426-f4de-442f-b50f-f9b2adacefcf",
      },
      status: {
        conditions: [
          {
            lastProbeTime: "2024-07-30T14:55:12.273Z",
            lastTransitionTime: "2024-07-30T14:55:15.106Z",
            status: true,
            type: "Ready",
          },
        ],
      },
    };

    const output = await resolveReferences(example);
    expect(output.env).toEqual({QUEUE_URL: "queues.acme.com_my-queue"});
  });

  test("chained references are resolved", async () => {
    const example = {
      apiVersion: "acme.com/v1",
      kind: "Workload",
      metadata: {
        name: "shop-backoffice",
      },
      image: "localhost:5001/shop-bo:latest",
      replicas: 1,
      port: 8081,
      env: {
        REACT_APP_API_URL: "${{ kblock://workload.acme.com/order-service/host }}:${{ kblock://workload.acme.com/order-service/port }}",
      },
    };

    const output = await resolveReferences(example);
    expect(output.env).toEqual({REACT_APP_API_URL: "workload.acme.com_order-service:workload.acme.com_order-service"});
  });
});
