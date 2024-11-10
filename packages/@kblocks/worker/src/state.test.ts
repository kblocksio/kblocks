import { RuntimeContext } from "./host";
import { _renderPatch, statusUpdater } from "./state";
import { test, expect, vi } from "vitest";

const host: RuntimeContext = {
  exec: vi.fn(),
  objRef: {
    apiVersion: "v1",
    kind: "Pod",
    name: "test",
    namespace: "default",
  },
} as any;


test("simple case", async () => {
  const current = {} as any;
  const update = { foo: "bar" };

  const patch = _renderPatch(current, update);
  expect(patch).toEqual(update);
});

test("add new conditions to an empty object", async () => {
  const current = {} as any;
  const update = { status: { conditions: [ { type: "foo", status: "bar" } ] } };

  const patch = _renderPatch(current, update);
  expect(patch).toEqual(update);
});

test("update an existing condition", async () => {
  const current = { status: { conditions: [{ type: "foo", status: "bar" }] } } as any;
  const update = { status: { conditions: [{ type: "foo", status: "baz", reason: "qux" }] } };

  const patch = _renderPatch(current, update);
  expect(patch).toEqual(update);
});

test("update an existing condition but keep the other conditions", async () => {
  const current = { status: { conditions: [{ type: "foo", status: "bar" }, { type: "baz", status: "qux" }] } } as any;
  const update = { status: { conditions: [{ type: "foo", status: "baz", reason: "qux" }] } };

  const patch = _renderPatch(current, update);
  expect(patch).toEqual({
    status: {
      conditions: [
        { type: "foo", status: "baz", reason: "qux" },
        { type: "baz", status: "qux" },
      ],
    },
  });
});

test("update some other status field for an existing object (do not send existing fields, only new fields)", async () => {
  const current = { status: { foo: "bar" } } as any;
  const update = { status: { baz: "qux" } };

  const patch = _renderPatch(current, update);
  expect(patch).toEqual(update);
});

test("update an existing field but keep the other fields", async () => {
  const current = { status: { foo: "bar", baz: "qux" } } as any;
  const update = { status: { foo: "baz" } };

  const patch = _renderPatch(current, update);
  expect(patch).toEqual(update);
});

test("update a field and also a condition", async () => {
  const current = { status: { foo: "bar", conditions: [{ type: "foo", status: "bar" }, { type: "baz", status: "qux" }] } } as any;
  const update = { status: { new_field: "new_value", conditions: [{ type: "foo", status: "new_baz" }] } };

  const patch = _renderPatch(current, update);
  expect(patch).toEqual({
    status: {
      new_field: "new_value",
      conditions: [{ type: "foo", status: "new_baz" }, { type: "baz", status: "qux" }],
    },
  });
});

test("update a field, current already have conditions (they are not sent)", async () => {
  const current = { status: { foo: "bar", conditions: [{ type: "foo", status: "bar" }, { type: "baz", status: "qux" }] } } as any;
  const update = { status: { new_field: "new_value" } };

  const patch = _renderPatch(current, update);
  expect(patch).toEqual(update);
});
