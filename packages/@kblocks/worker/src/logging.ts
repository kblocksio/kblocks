import { LogLevel, emitEvent } from "./api/index.js";
import { generateRandomId } from "./util.js";

const toLogFunction = {
  [LogLevel.DEBUG]: console.debug,
  [LogLevel.INFO]: console.info,
  [LogLevel.WARNING]: console.warn,
  [LogLevel.ERROR]: console.error,
};

export const CONSOLE_LOGGER: ReturnType<typeof createLogger> = {
  info: (message: string) => {
    console.info(message);
    return CONSOLE_LOGGER;
  },
  error: (message: string) => {
    console.error(message);
    return CONSOLE_LOGGER;
  },
  debug: (message: string) => {
    console.debug(message);
    return CONSOLE_LOGGER;
  },
  warn: (message: string) => {
    console.warn(message);
    return CONSOLE_LOGGER;
  },
};

export function createLogger(objUri: string, objType: string, requestId: string, options: { emitEvent?: boolean } = {}) {
  function log(message: string, level: LogLevel = LogLevel.INFO, parentLogId?: string) {
    const consoleFunction = toLogFunction[level];
    consoleFunction(">>", message);

    const logId = generateRandomId();

    const shouldEmitEvent = options.emitEvent ?? true;
    if (shouldEmitEvent) {
      emitEvent({
        type: "LOG",
        requestId,
        objUri,
        objType,
        message,
        level,
        timestamp: new Date(),
        logId,
        parentLogId,
      });
    }

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

