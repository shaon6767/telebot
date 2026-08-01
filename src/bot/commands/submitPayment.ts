import { InlineKeyboard } from "grammy";
import { getGroupByChatIdCached } from "../../cache/groupCache.js";
import {
    clearPendingReferenceCode,
    getPendingReferenceCode,
} from "../../cache/pendingReferenceCache.js";
import { logger } from "../../config/logger.js";
import {
    createTransaction,
    findPendingTransactionForUser,
} from "../../repositories/transaction.repository.js";
import type { MyContext } from "../types.js";

/**
 * Usage: /paid <transactionId>
 * Run in the same group where /subscribe was used, so we know which
 * group this payment claim belongs to.
 */
export async function submitPaymentCommand(ctx: MyContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (!chatId || !userId) return;

  const trxId = ctx.match?.toString().trim();
  if (!trxId) {
    await ctx.reply("Usage: /paid <your bKash/Nagad Transaction ID>");
    return;
  }

  const group = await getGroupByChatIdCached(BigInt(chatId));
  if (!group) {
    await ctx.reply("This group isn't set up for paid subscriptions.");
    return;
  }

  const existingPending = await findPendingTransactionForUser(
    group.id,
    BigInt(userId),
  );
  if (existingPending) {
    await ctx.reply(
      "You already have a pending payment awaiting approval — please wait.",
    );
    return;
  }

  const referenceCode =
    getPendingReferenceCode(group.id, BigInt(userId)) ?? "SUB-UNKNOWN";

  let transaction: Awaited<ReturnType<typeof createTransaction>>;
  try {
    transaction = await createTransaction({
      groupId: group.id,
      telegramUserId: BigInt(userId),
      referenceCode,
      trxId,
    });
  } catch (err: unknown) {
    // Postgres unique_violation — this exact trxId was already submitted,
    // by this buyer or anyone else, for any group.
    const code = (err as { code?: string })?.code;
    if (code === "23505") {
      await ctx.reply(
        "That Transaction ID has already been submitted before. If you believe this is a mistake, contact the group admin directly.",
      );
      return;
    }
    logger.error(
      { err, userId, groupId: group.id },
      "Failed to create transaction",
    );
    await ctx.reply(
      "Something went wrong recording your payment. Please try again.",
    );
    return;
  }

  if (!transaction) {
    logger.error(
      { userId, groupId: group.id },
      "createTransaction returned no row unexpectedly",
    );
    await ctx.reply(
      "Something went wrong recording your payment. Please try again.",
    );
    return;
  }

  clearPendingReferenceCode(group.id, BigInt(userId));
  await ctx.reply(
    "✅ Payment submitted. Waiting for the admin to confirm — you'll be notified here.",
  );

  const keyboard = new InlineKeyboard()
    .text("✅ Approve", `approve:${transaction.id}`)
    .text("❌ Reject", `reject:${transaction.id}`);

  try {
    await ctx.api.sendMessage(
      Number(group.ownerTelegramId),
      `💰 New payment claim for "${group.name}"\n\n` +
        `From: ${ctx.from?.first_name ?? "Unknown"} (@${ctx.from?.username ?? "no-username"})\n` +
        `Reference: ${referenceCode}\n` +
        `Transaction ID: ${trxId}\n\n` +
        `Check your bKash/Nagad statement, then tap below.`,
      { reply_markup: keyboard },
    );
  } catch (err) {
    logger.error(
      { err, transactionId: transaction.id },
      "Failed to notify admin of new payment claim",
    );
    await ctx.reply(
      "Your payment was recorded, but I couldn't reach the admin directly — please also message them to confirm.",
    );
  }
}
