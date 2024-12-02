import * as k8s from "@kubernetes/client-node";
import crypto from "crypto";
import { blockTypeFromUri, ControlCommand, formatBlockUri, Manifest, ObjectEvent, parseBlockUri } from "@kblocks/api";
import { emitEvent, subscribeToControlStream, getConfiguration, Access } from "@kblocks/common";
import { flush, unflushType } from "./flush";
import { applyObject } from "./apply";
import { deleteObject } from "./delete";
import { Context } from "./context";
import { refreshObject } from "./refresh";
import { patchObject } from "./patch";
import { readObject } from "./read";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const client = kc.makeApiClient(k8s.CustomObjectsApi);

export async function start(system: string, manifest: Manifest) {
  const group = manifest.definition.group;
  const version = manifest.definition.version;
  const plural = manifest.definition.plural;

  const ctx: Context = { system, group, version, plural, requestId: generateRandomId() };
  const channel = `${group}/${version}/${plural}/${system}`;

  const unsubscribe = await subscribeToControlStream(channel, async (message) => {
    if (getConfiguration().control.access === Access.Read) {
      console.log(`Received control message for read-only channel ${channel}. Ignoring...`);
      return;
    }

    const { command, blockUri } = parseCommand(ctx, message);

    try {
      await handleCommandMessage(ctx, command);
      return console.log(`Command ${command.type} for ${blockUri} succeeded`);
    } catch (error) {
      return handleError(ctx, blockUri, command, error);
    }
  });

  flush(ctx, manifest);
  
  return unsubscribe;
}

function handleError(ctx: Context, blockUri: string, command: ControlCommand, error: any) {
  const blockType = blockTypeFromUri(blockUri);

  if (error.statusCode === 404) {
    console.log(`Object ${blockUri} not found, sending a synthetic empty OBJECT event to delete it`);
    
    const obj: ObjectEvent = {
      requestId: ctx.requestId,
      type: "OBJECT",
      objType: blockType,
      objUri: blockUri,
      object: {},
      timestamp: new Date(),
      reason: typeToReason(command.type),
    };

    return emitEvent(obj);
  }

  const message = (error.body as any)?.message ?? `unknown error while handling ${command.type} for ${blockUri}`;
  console.error(message);
  
  emitEvent({
    requestId: ctx.requestId,
    type: "ERROR",
    objType: blockType,
    objUri: blockUri,
    message,
    timestamp: new Date(),
    body: command,
  });
}

function parseCommand(ctx: Context, message: string) {
  let command: ControlCommand;

  try {
    command = JSON.parse(message) as ControlCommand;
  } catch (error: any) {
    throw new Error(`Error parsing control command '${message}': ${error.message}`);
  }
  
  const type = command.type;
  if (!type) {
    throw new Error(`Invalid control command. Missing 'type' field: ${JSON.stringify(command)}`);
  }

  const blockUri = blockUriFromCommand(ctx, command);
  const { system: targetSystem } = parseBlockUri(blockUri);

  if (ctx.system !== targetSystem) {
    throw new Error(`Control message sent to wrong system. My system is ${ctx.system} but the message is for ${targetSystem}`);
  }

  return { command, blockUri };
}

function blockUriFromCommand(ctx: Context, command: ControlCommand): string {
  if (command.type === "APPLY") {
    const obj = command.object;
    const { group, version, plural, system } = ctx;
    const namespace = obj?.metadata?.namespace ?? "default";
    const name = obj?.metadata?.name;
    return formatBlockUri({ group, system, name, namespace, plural, version });
  }

  return command.objUri;
}

async function handleCommandMessage(ctx: Context, command: ControlCommand) {
  console.log(`Received control request: ${JSON.stringify(command)}`);

  switch (command.type) {
    case "APPLY":
      return await applyObject(client, ctx, command.object);

    case "PATCH":
      return await patchObject(client, ctx, command.objUri, command.object);

    case "DELETE":
      return await deleteObject(client, ctx, command.objUri);

    case "REFRESH":
      return await refreshObject(client, ctx, command.objUri);

    case "READ":
      return await readObject(client, ctx, command.objUri);

    default:
      throw new Error(`Unsupported control command: '${JSON.stringify(command)}'`);
  }
}

export async function handleCleanup(blocks: Manifest[], systemId: string) {
  for (const block of blocks) {
    const ctx: Context = {
      system: systemId,
      group: block.definition.group,
      version: block.definition.version,
      plural: block.definition.plural,
      requestId: generateRandomId(),
    };
    await unflushType(ctx, block);
  }
  console.log("Cleanup completed");
}

function generateRandomId() {
  return crypto.randomUUID();
}

function typeToReason(type: ControlCommand["type"]) {
  switch (type) {
    case "APPLY": return "CREATE";
    case "PATCH": return "UPDATE";
    case "DELETE": return "DELETE";
    case "REFRESH": return "SYNC";
    case "READ": return "READ";
    default:
      return "SYNC";
  }
}
