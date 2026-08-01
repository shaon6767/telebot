import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { groups } from "../db/schema.js";

export interface CreateGroupParams {
  telegramChatId: bigint;
  ownerTelegramId: bigint;
  name: string;
  priceBdt: number;
  durationDays: number;
  bkashNumber: string;
}

/**
 * Upserts on telegramChatId — re-running /setupgroup updates the existing
 * config instead of erroring on a unique-constraint violation.
 */
export async function createGroup(params: CreateGroupParams) {
  const [row] = await db
    .insert(groups)
    .values(params)
    .onConflictDoUpdate({
      target: groups.telegramChatId,
      set: {
        ownerTelegramId: params.ownerTelegramId,
        name: params.name,
        priceBdt: params.priceBdt,
        durationDays: params.durationDays,
        bkashNumber: params.bkashNumber,
      },
    })
    .returning();
  return row;
}

export async function findGroupByChatId(telegramChatId: bigint) {
  const [row] = await db
    .select()
    .from(groups)
    .where(eq(groups.telegramChatId, telegramChatId))
    .limit(1);
  return row ?? null;
}

export async function findGroupById(id: number) {
  const [row] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Batch lookup by id, used by the expiry-check cron sweep. Fetching one
 * group per subscriber in a loop (N+1) would mean hundreds of redundant
 * round-trips per sweep once there are real subscriber counts, even
 * though the underlying set of distinct groups is usually tiny. One
 * query, then an in-memory Map for O(1) lookup per subscriber.
 */
export async function findGroupsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db.select().from(groups).where(inArray(groups.id, ids));
}
