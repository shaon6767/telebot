import { logger } from "../../config/logger.js";
import { findGroupById } from "../../repositories/group.repository.js";
import { grantOrExtendSubscription } from "../../repositories/subscriber.repository.js";
import {
    approveTransactionIfPending,
    findTransactionById,
    rejectTransactionIfPending,
} from "../../repositories/transaction.repository.js";
import { createSingleUseInviteLink } from "../../services/inviteLink.service.js";
import { parseApprovalCallbackData } from "../../utils/callbackData.js";
import type { MyContext } from "../types.js";

export async function handleApprovalCallback(ctx: MyContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  const approverId = ctx.from?.id;
  if (!data || !approverId) return;

  const parsed = parseApprovalCallbackData(data);
  if (!parsed) {
    await ctx.answerCallbackQuery({ text: "Invalid action." });
    return;
  }

  const transaction = await findTransactionById(parsed.transactionId);
  if (!transaction) {
    await ctx.answerCallbackQuery({ text: "Transaction not found." });
    return;
  }

  const group = await findGroupById(transaction.groupId);
  if (!group) {
    await ctx.answerCallbackQuery({ text: "Group not found." });
    return;
  }

  // Verify the person tapping the button is the actual group owner —
  // don't trust "a button was tapped," verify who tapped it. Buttons
  // are sent in a DM to the owner, but this check is what actually
  // enforces it, not the fact that only they should have seen the DM.
  if (BigInt(approverId) !== group.ownerTelegramId) {
    await ctx.answerCallbackQuery({
      text: "Only the group owner can approve payments.",
    });
    return;
  }

  if (parsed.action === "reject") {
    const rejected = await rejectTransactionIfPending(
      transaction.id,
      "Rejected by admin",
    );
    if (!rejected) {
      await ctx.answerCallbackQuery({ text: "Already handled." });
      return;
    }
    await ctx.answerCallbackQuery({ text: "Rejected." });
    await safeEditMessage(ctx, "\n\n❌ Rejected.");
    try {
      await ctx.api.sendMessage(
        Number(transaction.telegramUserId),
        `❌ Your payment for "${group.name}" was rejected by the admin. Contact them if you believe this is a mistake.`,
      );
    } catch (err) {
      logger.error({ err }, "Failed to notify buyer of rejection");
    }
    return;
  }

  // Atomic — if two "Approve" taps race, only the first UPDATE actually
  // changes a row. The second call returns null and we stop here,
  // rather than double-granting access or double-creating invite links.
  const approved = await approveTransactionIfPending(
    transaction.id,
    BigInt(approverId),
  );
  if (!approved) {
    await ctx.answerCallbackQuery({
      text: "Already handled by someone else or already processed.",
    });
    return;
  }

  await ctx.answerCallbackQuery({ text: "Approved!" });
  await safeEditMessage(ctx, "\n\n✅ Approved.");

  await grantOrExtendSubscription({
    groupId: group.id,
    telegramUserId: transaction.telegramUserId,
    durationDays: group.durationDays,
  });

  try {
    const inviteLink = await createSingleUseInviteLink(
      ctx.api,
      group.telegramChatId,
    );
    await ctx.api.sendMessage(
      Number(transaction.telegramUserId),
      `✅ Payment approved! Join here (one-time link, use within 1 hour):\n${inviteLink}`,
    );
  } catch (err) {
    logger.error(
      { err, transactionId: transaction.id },
      "Failed to create/send invite link after approval",
    );
    await ctx.api.sendMessage(
      Number(transaction.telegramUserId),
      "✅ Payment approved, but there was an issue generating your invite link. The admin will follow up manually.",
    );
  }
}

async function safeEditMessage(ctx: MyContext, suffix: string): Promise<void> {
  try {
    const originalText = ctx.callbackQuery?.message?.text ?? "";
    await ctx.editMessageText(`${originalText}${suffix}`);
  } catch (err) {
    // Editing can fail harmlessly (message too old, etc) — not worth
    // surfacing to the admin, the approve/reject action already happened.
    logger.debug({ err }, "Failed to edit approval message (non-critical)");
  }
}
