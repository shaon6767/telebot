import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { subscribers } from "../db/schema.js";
import { calculateNewExpiry } from "../utils/subscriptionMath.js";

export async function findActiveSubscription(
  groupId: number,
  telegramUserId: bigint,
) {
  const [row] = await db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.groupId, groupId),
        eq(subscribers.telegramUserId, telegramUserId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Creates a new subscription, or extends an existing one's expiresAt.
 * Relies on the unique (groupId, telegramUserId) index in the schema —
 * one row per user per group, ever. A renewal always extends via
 * onConflictDoUpdate, it never inserts a duplicate row.
 */
export async function grantOrExtendSubscription(params: {
  groupId: number;
  telegramUserId: bigint;
  durationDays: number;
}) {
  const { groupId, telegramUserId, durationDays } = params;
  const existing = await findActiveSubscription(groupId, telegramUserId);
  const newExpiresAt = calculateNewExpiry(
    existing?.expiresAt ?? null,
    durationDays,
  );

  const [row] = await db
    .insert(subscribers)
    .values({
      groupId,
      telegramUserId,
      status: "active",
      expiresAt: newExpiresAt,
      reminderSentAt: null,
    })
    .onConflictDoUpdate({
      target: [subscribers.groupId, subscribers.telegramUserId],
      set: {
        status: "active",
        expiresAt: newExpiresAt,
        reminderSentAt: null,
      },
    })
    .returning();

  return row;
}

export async function findExpiredActiveSubscribers(now: Date = new Date()) {
  return db
    .select()
    .from(subscribers)
    .where(
      and(eq(subscribers.status, "active"), lte(subscribers.expiresAt, now)),
    );
}

/**
 * Subscribers expiring within the reminder window who haven't already
 * been sent one. gt(expiresAt, now) excludes anyone already past expiry —
 * those get caught by findExpiredActiveSubscribers and kicked instead.
 */
export async function findSubscribersNeedingReminder(
  reminderThreshold: Date,
  now: Date = new Date(),
) {
  return db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.status, "active"),
        lte(subscribers.expiresAt, reminderThreshold),
        gt(subscribers.expiresAt, now),
        isNull(subscribers.reminderSentAt),
      ),
    );
}

export async function markExpired(id: number) {
  await db
    .update(subscribers)
    .set({ status: "expired" })
    .where(eq(subscribers.id, id));
}

export async function markReminderSent(id: number) {
  await db
    .update(subscribers)
    .set({ reminderSentAt: new Date() })
    .where(eq(subscribers.id, id));
}
