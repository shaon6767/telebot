import { describe, expect, it } from "vitest";
import { calculateNewExpiry } from "../src/utils/subscriptionMath.js";

describe("calculateNewExpiry", () => {
  it("starts from now for a brand new subscriber", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = calculateNewExpiry(null, 30, now);
    expect(result.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });

  it("starts from now if the previous subscription already expired", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expired = new Date("2025-12-01T00:00:00Z");
    const result = calculateNewExpiry(expired, 30, now);
    expect(result.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });

  it("stacks on top of remaining time if renewed early, instead of wasting it", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const stillActive = new Date("2026-01-10T00:00:00Z");
    const result = calculateNewExpiry(stillActive, 30, now);
    expect(result.toISOString()).toBe("2026-02-09T00:00:00.000Z");
  });
});
