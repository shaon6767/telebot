import { relations } from "drizzle-orm";
import {
    bigint,
    index,
    integer,
    pgEnum,
    pgTable,
    serial,
    text,
    timestamp,
    uniqueIndex
} from "drizzle-orm/pg-core";

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "approved",
  "rejected",
]);

export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "active",
  "expired",
]);

/**
 * One row per admin's paid group/channel.
 * telegramChatId is the Telegram chat ID (negative for groups/channels).
 */
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  telegramChatId: bigint("telegram_chat_id", { mode: "bigint" })
    .notNull()
    .unique(),
  ownerTelegramId: bigint("owner_telegram_id", { mode: "bigint" }).notNull(),
  name: text("name").notNull(),
  priceBdt: integer("price_bdt").notNull(),
  durationDays: integer("duration_days").notNull(),
  bkashNumber: text("bkash_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One row per buyer per group. A renewal UPDATEs expiresAt on the
 * existing row rather than inserting a new one — enforced by the
 * unique index below, not just app-level convention.
 */
export const subscribers = pgTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    telegramUserId: bigint("telegram_user_id", { mode: "bigint" }).notNull(),
    status: subscriberStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // One subscriber row per user per group — renewals extend this row.
    oneSubscriptionPerUserPerGroup: uniqueIndex(
      "subscribers_group_user_unique",
    ).on(table.groupId, table.telegramUserId),
    // The expiry-check cron scans this constantly; without an index this
    // degrades as subscriber count grows.
    expiresAtIdx: index("subscribers_expires_at_idx").on(table.expiresAt),
  }),
);

/**
 * One row per payment claim. trxId is globally unique — stops the same
 * bKash/Nagad transaction ID being submitted twice, across ANY group,
 * not just within one group (real fraud vector otherwise).
 */
export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    telegramUserId: bigint("telegram_user_id", { mode: "bigint" }).notNull(),
    referenceCode: text("reference_code").notNull(),
    trxId: text("trx_id").notNull().unique(),
    status: transactionStatusEnum("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    approvedBy: bigint("approved_by", { mode: "bigint" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Used to check "does this user already have a pending claim for this
    // group" before creating a new one (stops double-submit duplicates).
    pendingLookupIdx: index("transactions_group_user_status_idx").on(
      table.groupId,
      table.telegramUserId,
      table.status,
    ),
  }),
);

export const groupsRelations = relations(groups, ({ many }) => ({
  subscribers: many(subscribers),
  transactions: many(transactions),
}));

export const subscribersRelations = relations(subscribers, ({ one }) => ({
  group: one(groups, {
    fields: [subscribers.groupId],
    references: [groups.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  group: one(groups, {
    fields: [transactions.groupId],
    references: [groups.id],
  }),
}));
