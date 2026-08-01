import type { Api } from "grammy";
import { withTelegramRetry } from "./telegramRetry.js";

/**
 * Removes a member by banning with a short until_date rather than a
 * separate ban-then-unban pair of calls. Telegram auto-lifts the ban
 * itself after the window — one atomic call, no race window where the
 * two calls could get out of order or one could fail without the other.
 * The member can still be re-invited later via a fresh invite link.
 */
export async function kickMember(
  api: Api,
  chatId: bigint,
  userId: bigint,
): Promise<void> {
  const liftAt = Math.floor(Date.now() / 1000) + 60; // auto-lifts in 60s
  await withTelegramRetry(
    () =>
      api.banChatMember(Number(chatId), Number(userId), {
        until_date: liftAt,
      }),
    "banChatMember",
  );
}
