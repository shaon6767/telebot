import { describe, expect, it } from "vitest";
import { parseApprovalCallbackData } from "../src/utils/callbackData.js";

describe("parseApprovalCallbackData", () => {
  it("parses a valid approve action", () => {
    expect(parseApprovalCallbackData("approve:42")).toEqual({
      action: "approve",
      transactionId: 42,
    });
  });

  it("parses a valid reject action", () => {
    expect(parseApprovalCallbackData("reject:7")).toEqual({
      action: "reject",
      transactionId: 7,
    });
  });

  it("rejects an unknown action", () => {
    expect(parseApprovalCallbackData("delete:1")).toBeNull();
  });

  it("rejects a non-numeric id", () => {
    expect(parseApprovalCallbackData("approve:abc")).toBeNull();
  });
});

/**
 * NOTE: the atomicity guarantee itself — that a race between two
 * "Approve" taps only lets one of them actually succeed — comes from the
 * conditional "WHERE status = 'pending'" UPDATE in
 * approveTransactionIfPending (src/repositories/transaction.repository.ts),
 * enforced by Postgres row-level locking during the UPDATE. Verifying
 * concurrent behavior requires an integration test against a real
 * Postgres instance, intentionally out of scope for this fast
 * unit-test layer.
 */
