import { test, expect } from "vitest";
import crypto from "crypto";

const SERVER_URL = "http://localhost:8080";

async function getResources() {
  const response = await fetch(`${SERVER_URL}/`);
  return response.json();
}

test("create resource", async () => {
  // send a request to create the resource
  const name = `my-resource-${crypto.randomUUID()}`;

  const response = await fetch(`${SERVER_URL}/control`, {
    method: "POST",
    body: JSON.stringify({
      type: "APPLY",
      object: {
        apiVersion: "testing.kblocks.io/v1",
        kind: "TestResource",
        metadata: { name },
        hello: "world1234",
      }
    })
  });

  expect(response.status).toBe(200);

  const key = `kblocks://testing.kblocks.io/v1/testresources/test-system/default/${name}`;

  let obj: any = undefined;

  console.log("waiting for resource to be created...");

  while (!obj) {
    const resources = await getResources();
    obj = resources[key];
    if (obj) {
      break;
    }

    await sleep(1000);
  }

  console.log(obj);
  
  // get the resource from the server
  expect(obj.apiVersion).toBe("testing.kblocks.io/v1");
  expect(obj.kind).toBe("TestResource");
  expect(obj.metadata.name).toBe(name);
  expect(obj.hello).toBe("world1234");
});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
