import { test, expect, beforeAll, vi } from "vitest";
import crypto from "crypto";
import { ControlCommand } from "../../packages/@kblocks/control/src/api";

const SERVER_URL = "http://localhost:8080";
const opts = { timeout: 60_000 };

beforeAll(async () => {
  vi.setConfig({ testTimeout: 120_000 });
});

async function getResources() {
  const response = await fetch(`${SERVER_URL}/`);
  return response.json();
}

async function getEvents() {
  const response = await fetch(`${SERVER_URL}/events`);
  return response.json();
}

async function sendControlCommand(command: ControlCommand) {
  const response = await fetch(`${SERVER_URL}/control`, {
    method: "POST",
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    throw new Error(`Failed to send control command: ${response.statusText}`);
  }
}

async function createResource(name: string, { kind = "TestResource", plural = "testresources" }: { kind?: string, plural?: string } = {}) {
  console.log("creating resource", name);

  await sendControlCommand({
    type: "APPLY",
    object: {
      apiVersion: "testing.kblocks.io/v1",
      kind,
      metadata: { name },
      hello: "world1234",
    }
  });

  const objUri = `kblocks://testing.kblocks.io/v1/${plural}/test-system/default/${name}`;

  let obj: any = undefined;

  console.log(`waiting for ${objUri} resource to be created...`);
  await waitUntil(async () => {
    const resources = await getResources();
    obj = resources[objUri];
    if (obj && obj.apiVersion) {
      return true;
    }
    return false;
  });

  console.log("object created", obj);
  return { obj, objUri };
}

async function waitForResourceToBeDeleted(objUri: string) {
  console.log(`waiting for ${objUri} resource to be deleted...`);

  await waitUntil(async () => {
    const resources = await getResources();
    return !(objUri in resources);
  });
}

async function waitForResourceToMatch(objUri: string, obj: any) {
  console.log(`waiting for ${objUri} resource to match...`, obj);

  await waitUntil(async () => {
    const resources = await getResources();
    try {
      const resource = resources[objUri];
      expect(resource).toMatchObject(obj);
      return true;
    } catch (error) {
      return false;
    }
  });
}

async function deleteResource(objUri: string, wait = true) {
  console.log("deleting resource", objUri);

  await sendControlCommand({
    type: "DELETE",
    objUri
  });


  if (wait) {
    await waitForResourceToBeDeleted(objUri);
  } 
}

async function patchResource(objUri: string, name: string) {
  console.log("patching resource", objUri);

  await sendControlCommand({
    type: "PATCH",
    objUri,
    object: {
      hello: "4321world",
    }
  });

  let obj: any = undefined;

  console.log(`waiting for ${objUri} resource to be patched...`);
  await waitUntil(async () => {
    const resources = await getResources();
    obj = resources[objUri];
    return obj;
  });

  return obj;
}

test("create resource", opts, async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  // send a request to create the resource and wait for it to be created
  const { obj } = await createResource(name);
  
  // get the resource from the server
  expect(obj.apiVersion).toBe("testing.kblocks.io/v1");
  expect(obj.kind).toBe("TestResource");
  expect(obj.metadata.name).toBe(name);
  expect(obj.hello).toBe("world1234");
});

test("patch resource", opts, async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  // send a request to create the resource and wait for it to be created
  const { obj, objUri } = await createResource(name);
  
  // get the resource from the server
  expect(obj.apiVersion).toBe("testing.kblocks.io/v1");
  expect(obj.kind).toBe("TestResource");
  expect(obj.metadata.name).toBe(name);
  expect(obj.hello).toBe("world1234");

  await patchResource(objUri, obj.metadata.name);
  await waitForResourceToMatch(objUri, { hello: "4321world" });
});

test("delete resource", opts, async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  // send a request to create the resource and wait for it to be created
  const { objUri } = await createResource(name);

  // send a request to delete the resource
  await deleteResource(objUri);
});

test("refresh resource that does not exist", opts, async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  // let's create and then delete the resource
  // send a request to create the resource and wait for it to be created
  const { objUri } = await createResource(name);
  await deleteResource(objUri);

  // now, let's ask for a refresh for the resource
  await sendControlCommand({
    type: "REFRESH",
    objUri
  });

  // we expect the last event to be an empty OBJECT to represent the deleted resource
  await waitUntilLastEvent((e, events) => {
    for (const event of (events ?? []).reverse()) {
      if (event.objUri === objUri && event.type === "OBJECT" && Object.keys(event.object ?? {}).length === 0) {
        return true;
      }
    }
    return false;
  });
});

test("refresh resource that exists", opts, async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  // send a request to create the resource and wait for it to be created
  const { objUri, obj } = await createResource(name);
  
  // send a request to refresh the resource
  await sendControlCommand({
    type: "REFRESH",
    objUri
  });

  let lastEvent: any = undefined;
  await waitUntilLastEvent((e, events) => {
    for (const event of (events ?? []).reverse()) {
      if (event.objUri === objUri && event.type === "OBJECT" && Object.keys(event.object ?? {}).length > 0) {
        lastEvent = event;
        return true;
      }
    }
    return false;
  });

  expect(lastEvent.object.apiVersion).toEqual(obj.apiVersion);
  expect(lastEvent.object.kind).toEqual(obj.kind);
  expect(lastEvent.object.metadata.name).toEqual(obj.metadata.name);
  expect(lastEvent.object.hello).toEqual("world1234");
});

test("delete resource that does not exist", opts, async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  const objUri = `kblocks://testing.kblocks.io/v1/testresources/test-system/default/${name}`;

  // send a request to delete the resource
  await deleteResource(objUri, /* wait */ false);

  // we expect the last event to be an empty OBJECT to represent the deleted resource
  await waitUntilLastEvent((e, events) => {
    for (const event of (events ?? []).reverse()) {
      if (event.objUri === objUri && event.type === "OBJECT" && Object.keys(event.object ?? {}).length === 0) {
        return true;
      }
    }
    return false;
  });
});

test("custom resource", opts, async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  // send a request to create the resource and wait for it to be created
  const { obj, objUri } = await createResource(name, { kind: "CustomResource", plural: "customresources" });
  
  // get the resource from the server
  expect(obj.apiVersion).toBe("testing.kblocks.io/v1");
  expect(obj.kind).toBe("CustomResource");
  expect(obj.metadata.name).toBe(name);
  expect(obj.hello).toBe("world1234");

  await waitForResourceToMatch(objUri, { status: { message: `custom-create world1234` } });

  await patchResource(objUri, obj.metadata.name);
  await waitForResourceToMatch(objUri, { status: { message: `custom-update 4321world` } });

  await deleteResource(objUri);
  await waitForResourceToBeDeleted(objUri);
});

async function waitUntilLastEvent(predicate: (event: any, events?: any[]) => boolean, timeout: number = 60_000) {
  let lastEvent: any = undefined;
  await waitUntil(async () => {   
    const events = await getEvents();
    lastEvent = events[events.length - 1];
    return predicate(lastEvent, events);
  }, timeout);

  console.log("lastEvent:", lastEvent);
  return lastEvent;
}

async function waitUntil(condition: () => Promise<boolean>, timeout: number = 60_000) {
  const end = Date.now() + timeout;
  while (!(await condition())) {
    if (Date.now() > end) {
      throw new Error("Timeout");
    }

    await sleep(500);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
