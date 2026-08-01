/**
 * Short, human-typeable reference code buyers include in the bKash/Nagad
 * payment note, so an admin matching payments against their statement
 * doesn't have to hunt for a bare, easy-to-mistype transaction ID.
 *
 * Not used for security or uniqueness enforcement — that job belongs to
 * the transaction's actual trxId (see db/schema.ts). This is purely a
 * human-matching convenience.
 */
export function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O, 1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SUB-${code}`;
}
