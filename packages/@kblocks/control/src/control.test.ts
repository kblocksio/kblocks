import { test, expect } from "vitest";
import { getConfiguration } from "@kblocks/common";

test("test", () => {
  expect(getConfiguration().channels.control).toBe("kblocks-control");
  expect(1).toBe(1);
});
