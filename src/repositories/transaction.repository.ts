import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { transactions } from "../db/schema.js";

export async function findPendingTransactionForUser(
  groupId: number,
  telegramUserId: bigint,
) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.groupId, groupId),
        eq(transactions.telegramUserId, telegramUserId),
        eq(transactions.status, "pending"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export interface CreateTransactionParams {
  groupId: number;
  telegramUserId: bigint;
  referenceCode: string;
  trxId: string;
}

/**
 * trxId has a UNIQUE constraint at the DB level (see schema.ts). If the
 * same transaction ID is submitted twice — by the same buyer or a
 * different one, for the same group or a different one — Postgres
 * throws error code 23505 here. Callers must catch and handle it
 * explicitly rather than assuming this always succeeds.
 */
export async function createTransaction(params: CreateTransactionParams) {
  const [row] = await db.insert(transactions).values(params).returning();
  return row;
}

export async function findTransactionById(id: number) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Atomic conditional approve. The WHERE clause includes status='pending',
 * so if two "Approve" taps race each other, only the first UPDATE
 * actually changes a row — Postgres serializes this at the row level.
 * The second call returns null, and the caller must treat that as
 * "already handled," not retry or duplicate the side effects.
 */
export async function approveTransactionIfPending(
  id: number,
  approvedBy: bigint,
) {
  const rows = await db
    .update(transactions)
    .set({ status: "approved", approvedBy, approvedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.status, "pending")))
    .returning();
  return rows[0] ?? null;
}

export async function rejectTransactionIfPending(id: number, reason: string) {
  const rows = await db
    .update(transactions)
    .set({ status: "rejected", rejectionReason: reason })
    .where(and(eq(transactions.id, id), eq(transactions.status, "pending")))
    .returning();
  return rows[0] ?? null;
}
