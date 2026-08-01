import { findGroupByChatId } from "../repositories/group.repository.js";

type Group = Awaited<ReturnType<typeof findGroupByChatId>>;
type CacheEntry = { value: Group; expiresAt: number };

// Short TTL — long enough to absorb repeated reads during a burst of
// /subscribe calls, short enough that a re-run of /setupgroup is
// reflected quickly without needing manual invalidation everywhere.
const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export async function getGroupByChatIdCached(
  telegramChatId: bigint,
): Promise<Group> {
  const key = telegramChatId.toString();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const value = await findGroupByChatId(telegramChatId);
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

/** Call right after a /setupgroup write so the next read isn't stale. */
export function invalidateGroupCache(telegramChatId: bigint) {
  cache.delete(telegramChatId.toString());
}
