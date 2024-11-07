const fetchMock = vi.spyOn(globalThis, "fetch");

import { emitEventAsync, LogLevel } from "../src/events";
import { test, vi } from "vitest";

test("emitEvent", async () => {
  let attempt = 0;

  fetchMock.mockImplementation(async () => {
    attempt++;

    if (attempt < 5) {
      return new Response(null, { status: 400, statusText: "Bad Request" });
    }

    if (attempt < 6) {
      throw new Error("Testing exceptions");
    }

    return new Response(null, { status: 200, statusText: "OK" });
  });

  await emitEventAsync({
    type: "LOG",
    level: LogLevel.INFO,
    message: "Hello, world!",
    objUri: "kblocks://kblocks.io/v1/blocks/test",
    objType: "test",
    timestamp: new Date(),
    requestId: "123",
  });
});