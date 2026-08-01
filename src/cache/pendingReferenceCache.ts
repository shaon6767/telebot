type Entry = { code: string; expiresAt: number };

// Buyers might take a while to actually complete a bKash/Nagad payment
// after seeing /subscribe's instructions — 30 minutes covers realistic
// payment time without holding stale codes forever.
const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, Entry>();

function key(groupId: number, telegramUserId: bigint): string {
  return `${groupId}:${telegramUserId.toString()}`;
}

/**
 * NOTE: this is a convenience cache, not a source of truth. It's
 * in-memory and single-instance — if the server restarts between a
 * buyer's /subscribe and their /paid, the cached code is lost and a
 * fresh one is generated instead. No functional harm: the transaction's
 * uniqueness guarantee comes from trxId's DB constraint, not this cache.
 */
export function setPendingReferenceCode(
  groupId: number,
  telegramUserId: bigint,
  code: string,
) {
  cache.set(key(groupId, telegramUserId), {
    code,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function getPendingReferenceCode(
  groupId: number,
  telegramUserId: bigint,
): string | null {
  const entry = cache.get(key(groupId, telegramUserId));
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.code;
}

export function clearPendingReferenceCode(
  groupId: number,
  telegramUserId: bigint,
) {
  cache.delete(key(groupId, telegramUserId));
}
