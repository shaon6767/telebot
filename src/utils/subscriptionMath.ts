/**
 * Pure function, no DB — easy to unit test in isolation.
 *
 * If the existing subscription hasn't expired yet, the new period stacks
 * on top of the remaining time (so renewing early doesn't waste days).
 * If it's already expired (or this is a first-time subscriber), the new
 * period starts counting from now.
 */
export function calculateNewExpiry(
  existingExpiresAt: Date | null,
  durationDays: number,
  now: Date = new Date(),
): Date {
  const base =
    existingExpiresAt && existingExpiresAt > now ? existingExpiresAt : now;
  return new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
}
