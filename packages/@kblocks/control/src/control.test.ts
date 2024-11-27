import { test, expect } from "vitest";
import { getEndpoints } from "@kblocks/api";

test("test", () => {
  expect(getEndpoints().channels.control).toBe("kblocks-control");
  expect(1).toBe(1);
});
