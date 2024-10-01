import { test, expect } from "vitest";
import crypto from "crypto";

const SERVER_URL = "http://localhost:8080";
const opts = { timeout: 60_000 };

async function getResources() {
  const response = await fetch(`${SERVER_URL}/`);
  return response.json();
}

async function createResource(name: string) {
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

  const objUri = `kblocks://testing.kblocks.io/v1/testresources/test-system/default/${name}`;

  let obj: any = undefined;

  console.log(`waiting for ${objUri} resource to be created...`);
  while (!obj) {
    const resources = await getResources();
    obj = resources[objUri];
    if (obj) {
      break;
    }

    await sleep(1000);
  }

  return { obj, objUri };
}

test("create resource", async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  // send a request to create the resource and wait for it to be created
  const { obj } = await createResource(name);
  
  // get the resource from the server
  expect(obj.apiVersion).toBe("testing.kblocks.io/v1");
  expect(obj.kind).toBe("TestResource");
  expect(obj.metadata.name).toBe(name);
  expect(obj.hello).toBe("world1234");
}, opts);

test("delete resource", async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  // send a request to create the resource and wait for it to be created
  const { obj, objUri } = await createResource(name);

  console.log("object created", obj);

  // send a request to delete the resource
  const response = await fetch(`${SERVER_URL}/control`, {
    method: "POST",
    body: JSON.stringify({
      type: "DELETE",
      objUri: `kblocks://testing.kblocks.io/v1/testresources/test-system/default/${name}`
    })
  });

  expect(response.status).toBe(200);

  // wait for the resource to be deleted
  console.log(`waiting for ${objUri} resource to be deleted...`);
  while (true) {
    const resources = await getResources();
    if (objUri in resources) {
      break;
    }
  }
}, opts);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
