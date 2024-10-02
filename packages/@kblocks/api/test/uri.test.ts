import { describe, expect, test } from "vitest";
import { parseBlockUri, blockTypeFromUri, formatBlockType, formatBlockUri } from "../src/uri.js";

const b = {
  group: "my-group",
  version: "v1",
  plural: "my-resources",
  system: "my-system",
  namespace: "my-namespace",
  name: "my-name",
}

test("formatBlockUri", () => {
  expect(formatBlockUri(b)).toEqual("kblocks://my-group/v1/my-resources/my-system/my-namespace/my-name");
});

test("parseBlockUri", () => {
  expect(parseBlockUri("kblocks://my-group/v1/my-resources/my-system/my-namespace/my-name")).toEqual(b);
});

test("blockTypeFromUri", () => {
  expect(blockTypeFromUri("kblocks://my-group/v1/my-resources/my-system/my-namespace/my-name")).toEqual("my-group/v1/my-resources");
});

test("formatBlockUri", () => {
  expect(formatBlockUri(b)).toEqual("kblocks://my-group/v1/my-resources/my-system/my-namespace/my-name");
});
