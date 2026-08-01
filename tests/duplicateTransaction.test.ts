import { describe, expect, it } from "vitest";
import { generateReferenceCode } from "../src/utils/referenceCode.js";

describe("generateReferenceCode", () => {
  it("always starts with SUB- and has 6 unambiguous trailing characters", () => {
    const code = generateReferenceCode();
    expect(code).toMatch(/^SUB-[A-HJ-NP-Z2-9]{6}$/);
  });

  it("produces different codes across calls (sanity check, not a hard guarantee)", () => {
    const codes = new Set(
      Array.from({ length: 20 }, () => generateReferenceCode()),
    );
    expect(codes.size).toBeGreaterThan(1);
  });
});

/**
 * NOTE: the actual duplicate-transaction-ID guard (a single trxId can
 * only ever be submitted once, across any group, any buyer) is enforced
 * by a Postgres UNIQUE constraint on transactions.trxId — see
 * src/db/schema.ts — not by application code. Verifying that constraint
 * requires an integration test against a real (or test-container)
 * Postgres instance, intentionally out of scope for this fast
 * unit-test layer.
 */
