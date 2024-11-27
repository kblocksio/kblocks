import { BindingContext, blockTypeFromUri, formatBlockUri, TFSTATE_ATTRIBUTE } from "@kblocks/api";
import { RuntimeContext } from "./host";
import { createLogger } from "./logging";
import { applyTerraform } from "./tf";
import { test, expect } from "vitest";
import { tempdir } from "./util";
import { join } from "path";
import fs from "fs";

test("applyTerraform with tfstate", async () => {
  const workdir = tempdir();
  const commands: string[][] = [];
  const prevState = {
    boom: "boom",
    hello: ["world", "foo", "bar"],
  }

  const exec = async (command: string, args: string[], options: any) => {
    expect(command).toBe("tofu");

    expect(options.cwd).toBe(workdir);
    commands.push([command, ...args]);

    if (args[0] === "output") {
      return JSON.stringify(`output: ${args[2]}`);
    }

    if (args[0] === "apply") {
      const p = JSON.parse(fs.readFileSync(join(workdir, "terraform.tfstate"), "utf8"));
      expect(p).toEqual(prevState);

      const newState = { boom: "new_state", bar: "new_bar" };
      fs.writeFileSync(join(workdir, "terraform.tfstate"), JSON.stringify(newState));
      return "";
    }

    return "";
  };

  const host = createHost(exec, {
    "KBLOCK_OUTPUTS_ACME-COM-V1-MYBLOCK": "out1,out2",
  });

  const ctx = createBindingContext({ [TFSTATE_ATTRIBUTE]: JSON.stringify(prevState) });
  const result = await applyTerraform(host, workdir, ctx);
  expect(commands).toEqual([
    ["tofu", "init", "-input=false", "-lock=false", "-no-color"],
    ["tofu", "apply", "-input=false", "-auto-approve", "-no-color"],
    ["tofu", "output", "-no-color", "out1"],
    ["tofu", "output", "-no-color", "out2"],
  ]);

  expect(result).toEqual({
    out1: "output: out1",
    out2: "output: out2",
    [TFSTATE_ATTRIBUTE]: JSON.stringify({
      boom: "new_state",
      bar: "new_bar",
    }),
  });
});


test("applyTerraform without tfstate", async () => {
  const workdir = tempdir();
  const commands: string[][] = [];

  const exec = async (command: string, args: string[], options: any) => {
    expect(command).toBe("tofu");
    expect(options.cwd).toBe(workdir);
    commands.push([command, ...args]);

    if (args[0] === "output") {
      return JSON.stringify(`output: ${args[2]}`);
    }

    return "";
  };

  const host = createHost(exec, {
    "KBLOCK_OUTPUTS_ACME-COM-V1-MYBLOCK": "out1,out2",
  });

  const ctx = createBindingContext();
  const result = await applyTerraform(host, workdir, ctx);
  expect(commands).toEqual([
    ["tofu", "init", "-input=false", "-lock=false", "-no-color"],
    ["tofu", "apply", "-input=false", "-auto-approve", "-no-color"],
    ["tofu", "output", "-no-color", "out1"],
    ["tofu", "output", "-no-color", "out2"],
  ]);

  expect(result).toEqual({
    out1: "output: out1",
    out2: "output: out2",
  });
});

const requestId = "REQID";
const system = "SYSTEM_ID";

const objUri = formatBlockUri({
  group: "acme.com",
  version: "v1",
  plural: "MyBlock",
  system: "test",
  namespace: "default",
  name: "test",
});

const objType = blockTypeFromUri(objUri);

const objRef = {
  apiVersion: "acme.com/v1",
  kind: "MyBlock",
  namespace: "default",
  name: "test",
};

const notImplemented = () => {
  throw new Error("not implemented");
};

const createBindingContext = (status?: any) => {
  return {
    watchEvent: "Added",
    object: {
      apiVersion: "acme.com/v1",
      kind: "MyBlock",
      metadata: {
        name: "test",
      },
      status,
    }
  } satisfies BindingContext;
};

const createHost = (exec: (command: string, args: string[], options: any) => Promise<string>, env: Record<string, string>) => {
  const tryGetenv = (name: string) => {
    return env[name];
  };

  return {
    exec,
    objUri,
    objRef,
    objType,
    newSlackThread: notImplemented,
    getenv: notImplemented,
    tryGetenv,
    chatCompletion: notImplemented,
    emitEvent: notImplemented,
    system,
    logger: createLogger(objUri, objType, requestId, { emitEvent: false }),
    requestId,
  } satisfies RuntimeContext;
}

