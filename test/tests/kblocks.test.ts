import { test, expect, beforeEach } from "vitest";
import * as k8s from "@kubernetes/client-node";
import crypto from "crypto";
import { ControlCommand, parseBlockUri } from "@kblocks/api";

const SERVER_URL = "http://localhost:8080";
const opts = { timeout: 120_000 };

beforeEach(async () => {
  const response = await fetch(`${SERVER_URL}/reset`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to reset server: ${response.statusText}`);
  }
});

async function getResources() {
  const response = await fetch(`${SERVER_URL}/`);
  return response.json();
}

async function getEvents() {
  const response = await fetch(`${SERVER_URL}/events`);
  return response.json();
}

async function sendControlCommand({
  system, group, version, plural
}: {
  system: string, group: string, version: string, plural: string
}, command: ControlCommand) {
  const response = await fetch(`${SERVER_URL}/control`, {
    method: "POST",
    body: JSON.stringify({
      system,
      group,
      version,
      plural,
      ...command
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to send control command: ${response.statusText}`);
  }
}

async function createResource(name: string, {
  kind = "TestResource",
  plural = "testresources",
  apiVersion = "testing.kblocks.io/v1",
  data = { hello: "world1234" },
  timeout,
  nowait = false,
}: { kind?: string, plural?: string, apiVersion?: string, data?: any, timeout?: number, nowait?: boolean } = {}) {
  console.log("creating resource", name);

  const parts = apiVersion.split("/");
  await sendControlCommand({
    system: "test-system",
    group: parts.length === 1 ? "core" : parts[0],
    version: parts.length === 1 ? parts[0] : parts[1],
    plural
  },{
    type: "APPLY",
    object: {
      apiVersion,
      kind,
      metadata: {
        name,
        labels: {
          "kblocks.io/system": "test-system",
        },
      },
      ...data,
    }
  });

  const version = apiVersion.split("/").length === 1 ? `core/${apiVersion}` : apiVersion;
  const objUri = `kblocks://${version}/${plural}/test-system/default/${name}`;

  let obj: any = undefined;

  if (nowait) {
    return { objUri };
  }

  console.log(`waiting for ${objUri} resource to be created...`);
  await waitUntil(async () => {
    const resources = await getResources();
    obj = resources[objUri];
    if (obj && obj.apiVersion) {
      return true;
    }
    return false;
  }, timeout);

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

async function waitForResourceWithCallback(objUri: string, callback: (resource: any) => boolean) {
  console.log(`waiting for ${objUri} resource to match...`);

  await waitUntil(async () => {
    const resources = await getResources();
    try {
      const resource = resources[objUri];
      return callback(resource);
    } catch (error) {
      return false;
    }
  });
}

async function deleteResource(objUri: string, wait = true) {
  console.log("deleting resource", objUri);
  const { system, group, version, plural } = parseBlockUri(objUri);
  await sendControlCommand({
    system,
    group,
    version,
    plural
  }, {
    type: "DELETE",
    objUri
  });


  if (wait) {
    await waitForResourceToBeDeleted(objUri);
  } 
}

async function patchResource(objUri: string, name: string) {
  console.log("patching resource", objUri);
  const { system, group, version, plural } = parseBlockUri(objUri);
  await sendControlCommand({
    system,
    group,
    version,
    plural
  }, {
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
 
const { system, group, version, plural } = parseBlockUri(objUri);

  // now, let's ask for a refresh for the resource
  await sendControlCommand({
    system,
    group,
    version,
    plural
  }, {
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
  const { system, group, version, plural } = parseBlockUri(objUri);

  // send a request to refresh the resource
  await sendControlCommand({
    system,
    group,
    version,
    plural
  }, {
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

test("read resource", opts, async () => {
  const name = `my-read-resource-${crypto.randomUUID()}`;

  const { objUri } = await createResource(name);
  const { system, group, version, plural } = parseBlockUri(objUri);

  await sendControlCommand({
    system,
    group,
    version,
    plural
  }, {
    type: "READ",
    objUri
  });

  await waitForResourceWithCallback(objUri, (resource: any) => {
    const healthy = resource.status.conditions.find((c: any) => c.type === "Healthy");
    return healthy &&
      healthy.status === "True" &&
      healthy.message === "ok" &&
      healthy.reason === "ok";
  });
});

test("flush resource", opts, async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  // send a request to create the resource and wait for it to be created
  const { obj, objUri } = await createResource(name, {
    kind: "Secret",
    plural: "secrets",
    apiVersion: "v1",
    data: { data: { username: "YWRtaW4=" } }
  });
  
  // get the resource from the server
  expect(obj.apiVersion).toBe("core/v1");
  expect(obj.kind).toBe("Secret");
  expect(obj.metadata.name).toBe(name);
  expect(obj.data.username).toBe("YWRtaW4=");

  await deleteResource(objUri);
  await waitForResourceToBeDeleted(objUri);
});

test("git resource", opts, async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  await createResource(name, {
    kind: "GitResource",
    plural: "gitresources",
    apiVersion: "testing.kblocks.io/v1",
    data: { hello: "world" },
    nowait: true,
  });

  let obj: any = undefined;
  const objUri = `kblocks://kblocks.io/v1/gitcontents/test-system/default/gitresources-default-${name}`;
  await waitUntil(async () => {
    const resources = await getResources();
    obj = resources[objUri];
    if (obj && obj.apiVersion) {
      return true;
    }
    return false;
  }, 60_000);
  
  // get the resource from the server
  expect(obj.apiVersion).toBe("kblocks.io/v1");
  expect(obj.kind).toBe("GitContent");
  expect(obj.metadata.name).toBe(`gitresources-default-${name}`);
  expect(obj.owner).toBe("myorg");
  expect(obj.name).toBe("myrepo");
  expect(obj.createPullRequest).toBe(true);
  expect(obj.files[0].path).toBe(`gitresources-default-${name}.yaml`);

  const resource = k8s.loadYaml(obj.files[0].content) as any;
  expect(resource.apiVersion).toBe("testing.kblocks.io/v1");
  expect(resource.kind).toBe("GitResource");
  expect(resource.metadata.name).toBe(name);
  expect(resource.hello).toBe("world");

  await deleteResource(objUri);
  await waitForResourceToBeDeleted(objUri);
});

test("cant create resource with read access", opts, async () => {
  const name = `my-resource-${crypto.randomUUID()}`;

  try  {
    await createResource(name, {
      kind: "TerraformResource",
      plural: "tfresources",
      apiVersion: "kblocks.io/v1",
      data: { input: "my_input_666" },
      timeout: 10_000,
    });
  } catch (error) {
    expect(error.message).toContain("Timeout");
  }
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
