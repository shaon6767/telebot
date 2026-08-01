import type { Conversation } from "@grammyjs/conversations";
import { invalidateGroupCache } from "../../cache/groupCache.js";
import { createGroup } from "../../repositories/group.repository.js";
import type { MyContext } from "../types.js";

/**
 * Multi-step setup wizard using grammY's conversations plugin.
 *
 * IMPORTANT: the conversations plugin may replay this function's earlier
 * steps when resuming after a restart. The DB write is wrapped in
 * conversation.external() specifically so that replay can never cause
 * it to run twice — only the actual first execution performs the write.
 */
export async function setupGroupConversation(
  conversation: Conversation<MyContext, MyContext>,
  ctx: MyContext,
): Promise<void> {
  const ownerTelegramId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  if (!ownerTelegramId || !chatId) {
    await ctx.reply(
      "Something went wrong identifying this chat or user. Please try again.",
    );
    return;
  }

  await ctx.reply(
    "Let's set up paid access for this group.\n\nFirst — what's the group name (just for your own reference)?",
  );
  const nameCtx = await conversation.wait();
  const name = nameCtx.message?.text?.trim();
  if (!name) {
    await ctx.reply("I need a text name. Run /setupgroup to try again.");
    return;
  }

  await ctx.reply(
    "What's the subscription price in BDT? (numbers only, e.g. 500)",
  );
  const priceCtx = await conversation.wait();
  const priceText = priceCtx.message?.text?.trim();
  const priceBdt = priceText ? parseInt(priceText, 10) : NaN;
  if (!priceText || Number.isNaN(priceBdt) || priceBdt <= 0) {
    await ctx.reply(
      "That doesn't look like a valid price. Run /setupgroup to try again.",
    );
    return;
  }

  await ctx.reply(
    "How many days should one subscription period last? (e.g. 30)",
  );
  const durationCtx = await conversation.wait();
  const durationText = durationCtx.message?.text?.trim();
  const durationDays = durationText ? parseInt(durationText, 10) : NaN;
  if (!durationText || Number.isNaN(durationDays) || durationDays <= 0) {
    await ctx.reply(
      "That doesn't look like a valid number of days. Run /setupgroup to try again.",
    );
    return;
  }

  await ctx.reply(
    "What's the bKash/Nagad number buyers should send payment to?",
  );
  const numberCtx = await conversation.wait();
  const bkashNumber = numberCtx.message?.text?.trim();
  if (!bkashNumber) {
    await ctx.reply("I need a payment number. Run /setupgroup to try again.");
    return;
  }

  await conversation.external(() =>
    createGroup({
      telegramChatId: BigInt(chatId),
      ownerTelegramId: BigInt(ownerTelegramId),
      name,
      priceBdt,
      durationDays,
      bkashNumber,
    }),
  );
  invalidateGroupCache(BigInt(chatId));

  await ctx.reply(
    `✅ Group set up.\n\n` +
      `Price: ৳${priceBdt} / ${durationDays} days\n` +
      `Payment number: ${bkashNumber}\n\n` +
      `Tell buyers to run /subscribe inside this group.`,
  );
}
