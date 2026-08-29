/* Minimal logger — swap for winston/pino if needed */
type Level = "info" | "warn" | "error" | "debug";

function stamp(): string {
  return new Date().toISOString();
}

function log(level: Level, message: string, meta?: unknown): void {
  const prefix = `[${stamp()}] [${level.toUpperCase()}]`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](prefix, message, meta);
  } else {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](prefix, message);
  }
}

export const logger = {
  info: (message: string, meta?: unknown): void => log("info", message, meta),
  warn: (message: string, meta?: unknown): void => log("warn", message, meta),
  error: (message: string, meta?: unknown): void => log("error", message, meta),
  debug: (message: string, meta?: unknown): void => {
    if (process.env.NODE_ENV !== "production") log("debug", message, meta);
  },
};
