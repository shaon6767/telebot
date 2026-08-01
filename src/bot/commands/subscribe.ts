import type { MyContext } from "../types.js";
import { getGroupByChatIdCached } from "../../cache/groupCache.js";
import { findPendingTransactionForUser } from "../../repositories/transaction.repository.js";
import { setPendingReferenceCode } from "../../cache/pendingReferenceCache.js";
import { generateReferenceCode } from "../../utils/referenceCode.js";

/**
 * Run by a buyer inside the group they want to join, so the bot knows
 * which group's price/bKash number to show.
 *
 * NOTE (documented scope, not an oversight): this assumes the group is
 * reachable enough for a prospective buyer to send this command before
 * being a paying member — e.g. a public group, or the admin sharing a
 * temporary open invite. Fully locked groups where non-members truly
 * cannot send any message would need a DM-based flow instead; that's a
 * deliberate v2 scope cut, not part of this MVP.
 */
export async function subscribeCommand(ctx: MyContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (!chatId || !userId) return;

  const group = await getGroupByChatIdCached(BigInt(chatId));
  if (!group) {
    await ctx.reply("This group isn't set up for paid subscriptions yet.");
    return;
  }

  const existingPending = await findPendingTransactionForUser(
    group.id,
    BigInt(userId),
  );
  if (existingPending) {
    await ctx.reply(
      `You already have a pending payment (ref ${existingPending.referenceCode}) awaiting admin approval. Please wait — no need to submit again.`,
    );
    return;
  }

  const referenceCode = generateReferenceCode();
  setPendingReferenceCode(group.id, BigInt(userId), referenceCode);

  await ctx.reply(
    `💳 Subscribe to "${group.name}"\n\n` +
      `Price: ৳${group.priceBdt} for ${group.durationDays} days\n` +
      `Send payment to bKash/Nagad number: ${group.bkashNumber}\n\n` +
      `Include this reference when paying: ${referenceCode}\n\n` +
      `Once paid, run: /paid <your Transaction ID>`,
  );
}
