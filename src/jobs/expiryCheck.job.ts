import type { Bot } from "grammy";
import cron from "node-cron";
import pLimit from "p-limit";
import type { MyContext } from "../bot/types.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { findGroupsByIds } from "../repositories/group.repository.js";
import {
  findExpiredActiveSubscribers,
  findSubscribersNeedingReminder,
  markExpired,
  markReminderSent,
} from "../repositories/subscriber.repository.js";
import { kickMember } from "../services/memberAccess.service.js";
import { sendRenewalReminder } from "../services/reminder.service.js";

const REMINDER_WINDOW_DAYS = 3;

// Caps concurrent outbound Telegram calls so a large sweep (say, 200
// expired subscribers at once) doesn't blow past Telegram's rate limits
// (~30 msgs/sec globally, stricter per-chat). This is the throttle the
// system needs at this scale — a Redis-backed job queue would be solving
// a problem this bot doesn't have yet.
const limit = pLimit(10);

async function processExpiredSubscribers(bot: Bot<MyContext>): Promise<void> {
  const expired = await findExpiredActiveSubscribers();
  if (expired.length === 0) return;

  logger.info({ count: expired.length }, "Processing expired subscribers");

  // One batched query for all distinct groups involved, instead of one
  // findGroupById call per subscriber (N+1) — the number of distinct
  // groups is typically tiny compared to subscriber count.
  const uniqueGroupIds = [...new Set(expired.map((sub) => sub.groupId))];
  const groupsList = await findGroupsByIds(uniqueGroupIds);
  const groupsById = new Map(groupsList.map((g) => [g.id, g]));

  await Promise.all(
    expired.map((sub) =>
      limit(async () => {
        const group = groupsById.get(sub.groupId);
        if (!group) {
          logger.warn(
            { subscriberId: sub.id, groupId: sub.groupId },
            "Group not found for expired subscriber",
          );
          return;
        }
        try {
          await kickMember(bot.api, group.telegramChatId, sub.telegramUserId);
          await markExpired(sub.id);
          logger.info({ subscriberId: sub.id }, "Kicked expired subscriber");
        } catch (err) {
          logger.error(
            { err, subscriberId: sub.id },
            "Failed to kick expired subscriber",
          );
        }
      }),
    ),
  );
}

async function processReminders(bot: Bot<MyContext>): Promise<void> {
  const reminderThreshold = new Date(
    Date.now() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const dueForReminder =
    await findSubscribersNeedingReminder(reminderThreshold);
  if (dueForReminder.length === 0) return;

  logger.info({ count: dueForReminder.length }, "Sending renewal reminders");

  const uniqueGroupIds = [...new Set(dueForReminder.map((sub) => sub.groupId))];
  const groupsList = await findGroupsByIds(uniqueGroupIds);
  const groupsById = new Map(groupsList.map((g) => [g.id, g]));

  await Promise.all(
    dueForReminder.map((sub) =>
      limit(async () => {
        const group = groupsById.get(sub.groupId);
        if (!group) return;
        const daysLeft = Math.ceil(
          (sub.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        );
        try {
          await sendRenewalReminder(
            bot.api,
            sub.telegramUserId,
            group.name,
            daysLeft,
          );
          await markReminderSent(sub.id);
        } catch (err) {
          logger.error(
            { err, subscriberId: sub.id },
            "Failed to send reminder",
          );
        }
      }),
    ),
  );
}

export function startExpiryCheckJob(bot: Bot<MyContext>): void {
  const cronExpression = `*/${env.EXPIRY_CHECK_INTERVAL_MINUTES} * * * *`;
  cron.schedule(cronExpression, async () => {
    logger.debug("Running expiry check sweep");
    try {
      await processExpiredSubscribers(bot);
      await processReminders(bot);
    } catch (err) {
      logger.error({ err }, "Expiry check job failed");
    }
  });
  logger.info({ cronExpression }, "Expiry check job scheduled");
}
