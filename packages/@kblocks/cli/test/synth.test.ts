import fs from "fs";
import path from "path";
import os from "os";
import { expect, test, beforeEach } from "vitest";
import { synth } from "../src/build";
import yaml from "yaml";
import { Manifest } from "../src/api";

const fixtures: Record<string, Manifest> = {
  minimal: {
    engine: "noop",
    definition: {
      group: "boom.com",
      version: "v1",
      kind: "Boom",
      plural: "booms",
      schema: {
        type: "object",
        properties: { name: { type: "string" } },
      },
    }
  },

  with_operator_settings: {
    engine: "noop",
    definition: {
      group: "boom.com",
      version: "v1",
      kind: "Boom",
      plural: "booms",
      schema: {
        type: "object",
        properties: { name: { type: "string" } },
      },
    },
    operator: {
      namespace: "my-namespace",
      envSecrets: {
        SECRET1: "secret-1",
        SECRET2: "secret-2",
      },
      envConfigMaps: {
        CONFIGMAP1: "configmap-1",
      },
      env: {
        ENV1: "env-1",
        ENV2: "env-2",
      },
      workers: 2,
    }
  },
};

beforeEach(() => {
  process.env.KBLOCKS_VERSION = "99.99.99";
});

test("minimal block snapshot", () => {
  const objects = synthBlock(fixtures.minimal);
  expect(objects).toMatchSnapshot();
});


test("operator configuration", () => {
  const objects = synthBlock(fixtures.with_operator_settings);
  expect(objects).toMatchSnapshot();
});

test("all non-cluster objects are namespaced and cluster-scoped are not", () => {
  const objects = synthBlock(fixtures.minimal);

  // these are cluster-scoped, so they should not have a namespace
  const cluster = [
    'ClusterRole',
    'ClusterRoleBinding',
    'CustomResourceDefinition',
  ];

  for (const object of objects) {
    if (cluster.includes(object.kind)) {
      expect(object.metadata.namespace).toBeUndefined();
    } else {
      expect(object.metadata.namespace).toBeDefined();
      expect(object.metadata.namespace).toBe("{{ .Release.Namespace }}"); // <-- this is the default
    }
  }
});



// -----------------------------------------------------------------------------------------------------------

function synthBlock(block: Manifest) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kblocks-test-"));

  synth({
    block,
    output: tempDir,
  });

  const templates = fs.readdirSync(path.join(tempDir, "templates"));
  expect(templates.length).toBe(1);

  const data = fs.readFileSync(path.join(tempDir, "templates", templates[0]), "utf8");
  return yaml.parseAllDocuments(data).map(doc => doc.toJSON());
};