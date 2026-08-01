import { getGroupByChatIdCached } from "../../cache/groupCache.js";
import { findActiveSubscription } from "../../repositories/subscriber.repository.js";
import type { MyContext } from "../types.js";

export async function myStatusCommand(ctx: MyContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (!chatId || !userId) return;

  const group = await getGroupByChatIdCached(BigInt(chatId));
  if (!group) {
    await ctx.reply("This group isn't set up for paid subscriptions.");
    return;
  }

  const subscription = await findActiveSubscription(group.id, BigInt(userId));
  const now = new Date();

  if (
    !subscription ||
    subscription.status !== "active" ||
    subscription.expiresAt <= now
  ) {
    await ctx.reply(
      "You don't have an active subscription here. Run /subscribe to get one.",
    );
    return;
  }

  const daysLeft = Math.ceil(
    (subscription.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );
  await ctx.reply(
    `✅ Active. ${daysLeft} day(s) remaining (expires ${subscription.expiresAt.toDateString()}).`,
  );
}
