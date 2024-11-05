import * as k8s from "@kubernetes/client-node";
import { blockTypeFromUri, ControlCommand, emitEvent, ErrorEvent, formatBlockUri, Manifest, ObjectEvent, parseBlockUri } from "./api";
import { flush } from "./flush";
import { applyObject } from "./apply";
import { deleteObject } from "./delete";
import { Context } from "./context";
import { refreshObject } from "./refresh";
import { patchObject } from "./patch";
import { connect } from "./socket";
import { readObject } from "./read";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const client = kc.makeApiClient(k8s.CustomObjectsApi);

export function start(controlUrl: string, system: string, manifest: Manifest) {
  const params = new URLSearchParams({ system }).toString();
  const group = manifest.definition.group;
  const version = manifest.definition.version;
  const plural = manifest.definition.plural;
  const url = `${controlUrl}/${group}/${version}/${plural}?${params}`;

  const ctx: Context = { system, group, version, plural };

  const connection = connect(url);

  connection.on("open", () => {
    console.log("Control connection opened");

    // flush the current state of the system to the control plane
    flush(system, manifest);
  });

  connection.on("message", (message) => {
    const { command, blockUri } = parseCommand(ctx, message);

    handleCommandMessage(ctx, command)
      .then(() => console.log(`Command ${command.type} for ${blockUri} succeeded`))
      .catch((error) => handleError(blockUri, command, error))
  });

  return connection;
}

function handleError(blockUri: string, command: ControlCommand, error: any) {
  const blockType = blockTypeFromUri(blockUri);

  if (error.statusCode === 404) {
    console.log(`Object ${blockUri} not found, sending a synthetic empty OBJECT event to delete it`);
    return emitEvent({
      type: "OBJECT",
      objType: blockType,
      objUri: blockUri,
      object: {},
    } as ObjectEvent);
  }

  const msg = (error.body as any)?.message ?? "unknown error";
  const message = `Error handling command ${JSON.stringify(command.type)} for ${blockUri}: ${msg}`;
  console.error(message);
  
  emitEvent({
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