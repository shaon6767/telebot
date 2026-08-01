import pino from "pino";
import { env } from "./env.js";

/**
 * Structured logging so a payment dispute ("I paid, why was I kicked?")
 * can be resolved by grepping logs for a userId or trxId, instead of
 * scrolling raw console.log text.
 *
 * In development: pretty-printed, human-readable.
 * In production: plain JSON, since Render's log viewer and any future
 * log aggregator can filter/search structured JSON far better than text.
 */
const baseOptions: pino.LoggerOptions = {
  level: env.NODE_ENV === "production" ? "info" : "debug",
};

export const logger = pino(
  env.NODE_ENV === "production"
    ? baseOptions
    : {
        ...baseOptions,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      },
);
