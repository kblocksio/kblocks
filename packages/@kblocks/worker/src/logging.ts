import crypto from "crypto";
import { LogLevel } from "./types/index.js";
import { emitEvent } from "./events.js";

const toLogFunction = {
  [LogLevel.DEBUG]: console.debug,
  [LogLevel.INFO]: console.info,
  [LogLevel.WARNING]: console.warn,
  [LogLevel.ERROR]: console.error,
};

export function createLogger(objUri: string, objType: string) {
  function log(message: string, level: LogLevel = LogLevel.INFO, parentLogId?: string) {
    const consoleFunction = toLogFunction[level];
    consoleFunction(">>", message);

    const logId = generateGroupId();

    emitEvent({
      type: "LOG",
      objUri,
      objType,
      message,
      level,
      timestamp: new Date().toISOString(),
      logId,
      parentLogId,
    });

    return {
      debug: (message: string) => log(message, LogLevel.DEBUG, logId),
      info: (message: string) => log(message, LogLevel.INFO, logId),
      warn: (message: string) => log(message, LogLevel.WARNING, logId),
      error: (message: string) => log(message, LogLevel.ERROR, logId),
    }
  }

  return {
    debug: (message: string) => log(message, LogLevel.DEBUG),
    info: (message: string) => log(message, LogLevel.INFO),
    warn: (message: string) => log(message, LogLevel.WARNING),
    error: (message: string) => log(message, LogLevel.ERROR),
};
}

function generateGroupId() {
  return crypto.randomUUID();
}