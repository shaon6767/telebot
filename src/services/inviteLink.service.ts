import type { Api } from "grammy";
import { withTelegramRetry } from "./telegramRetry.js";

/**
 * Single-use, short-lived invite link.
 * member_limit: 1 — can only ever add one person, so it can't be
 * forwarded to let extra people in for free.
 * expire_date — short window since it's meant to be used immediately
 * after approval, not saved and used later by someone else.
 *
 * Telegram chat IDs fit safely within JS's Number range even for large
 * supergroup/channel IDs (well under Number.MAX_SAFE_INTEGER), so the
 * bigint -> Number conversion here is safe.
 */
export async function createSingleUseInviteLink(
  api: Api,
  chatId: bigint,
): Promise<string> {
  const expireInSeconds = 60 * 60; // 1 hour
  const link = await withTelegramRetry(
    () =>
      api.createChatInviteLink(Number(chatId), {
        member_limit: 1,
        expire_date: Math.floor(Date.now() / 1000) + expireInSeconds,
      }),
    "createChatInviteLink",
  );
  return link.invite_link;
}
