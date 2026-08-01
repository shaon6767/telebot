import pRetry from "p-retry";
import { logger } from "../config/logger.js";

/**
 * Wraps any Telegram Bot API call with retry-with-backoff. Network blips
 * and transient 5xx responses from Telegram shouldn't silently drop a
 * message, an invite link, or a kick — those are the exact actions
 * where "it just failed once" is unacceptable.
 */
export async function withTelegramRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  return pRetry(fn, {
    retries: 3,
    onFailedAttempt: (error) => {
      logger.warn(
        { label, attempt: error.attemptNumber, retriesLeft: error.retriesLeft },
        `Telegram API call failed, retrying: ${label}`,
      );
    },
  });
}
