import { logger } from "../../config/logger.js";
import type { MyContext } from "../types.js";

/**
 * Confirms the person running an admin-only command is actually an
 * admin/creator of the Telegram group itself — checked against
 * Telegram's own chat member data via the Bot API, not our database,
 * since at /setupgroup time our Group row may not exist yet.
 */
export async function requireGroupAdmin(
  ctx: MyContext,
  next: () => Promise<void>,
): Promise<void> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;

  if (!chatId || !userId) {
    await ctx.reply("Couldn't identify this chat or user.");
    return;
  }

  if (ctx.chat?.type === "private") {
    await ctx.reply(
      "Run this command inside the group you want to set up, not in a private chat.",
    );
    return;
  }

  try {
    const member = await ctx.api.getChatMember(chatId, userId);
    if (member.status !== "administrator" && member.status !== "creator") {
      await ctx.reply("Only a group admin can run this command.");
      return;
    }
  } catch (err) {
    logger.error({ err, chatId, userId }, "Failed to verify admin status");
    await ctx.reply(
      "Couldn't verify your admin status — try again in a moment.",
    );
    return;
  }

  await next();
}
