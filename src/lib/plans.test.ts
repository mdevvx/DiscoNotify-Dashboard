import { describe, expect, it } from "vitest";
import { cardSubscriptionRunning, canAddAccount, pausedByFreePlan, planState, type PlanRow } from "./plans";

const acc = (id: string, platform: string, created_at: string, enabled = true) => ({ id, platform, created_at, enabled });

describe("pausedByFreePlan", () => {
  const list = [
    acc("b", "youtube", "2025-01-02T00:00:00Z"),
    acc("a", "youtube", "2025-01-01T00:00:00Z"),
    acc("c", "twitch", "2025-01-03T00:00:00Z"),
    acc("d", "youtube", "2025-01-04T00:00:00Z"),
  ];
  it("keeps the oldest enabled account per platform on a free server", () => {
    expect([...pausedByFreePlan(list, false)].sort()).toEqual(["b", "d"]);
  });
  it("pauses nothing when unlimited", () => {
    expect(pausedByFreePlan(list, true).size).toBe(0);
  });
  it("ignores disabled accounts when picking the one that stays", () => {
    const l = [acc("a", "youtube", "2025-01-01T00:00:00Z", false), acc("b", "youtube", "2025-01-02T00:00:00Z"), acc("c", "youtube", "2025-01-03T00:00:00Z")];
    expect([...pausedByFreePlan(l, false)]).toEqual(["c"]);
  });
  it("breaks created_at ties by id", () => {
    const l = [acc("z", "kick", "2025-01-01T00:00:00Z"), acc("m", "kick", "2025-01-01T00:00:00Z")];
    expect([...pausedByFreePlan(l, false)]).toEqual(["z"]);
  });
});

describe("canAddAccount", () => {
  const base = { freePerPlatform: 1, maxTotal: 25, total: 1 };
  it("blocks a second account of a platform on free", () => {
    expect(canAddAccount({ ...base, unlimited: false, platform: "youtube", counts: { youtube: 1 } })).toEqual({ ok: false, reason: "free_limit" });
  });
  it("allows another platform on free", () => {
    expect(canAddAccount({ ...base, unlimited: false, platform: "twitch", counts: { youtube: 1 } }).ok).toBe(true);
  });
  it("enforces the server cap even when paid", () => {
    expect(canAddAccount({ ...base, unlimited: true, platform: "youtube", counts: {}, total: 25 })).toEqual({ ok: false, reason: "server_limit" });
  });
});

describe("planState / cardSubscriptionRunning", () => {
  const row = (p: Partial<PlanRow>): PlanRow => ({ plan: "free", unlimited: false, paid_until: null, card_status: null, card_cancels_at: null, has_card_subscription: false, ...p });
  it("maps the billing table states", () => {
    expect(planState(row({}), false)).toBe("free_new");
    expect(planState(row({}), true)).toBe("free_lapsed");
    expect(planState(row({ plan: "paid", unlimited: true, card_status: "active", has_card_subscription: true }), true)).toBe("paid_card");
    expect(planState(row({ plan: "paid", unlimited: true, card_status: "active", has_card_subscription: true, card_cancels_at: "2030-01-01" }), true)).toBe("paid_card_cancelling");
    expect(planState(row({ plan: "paid", unlimited: true, card_status: "past_due", has_card_subscription: true }), true)).toBe("paid_card_past_due");
    expect(planState(row({ plan: "paid", unlimited: true, paid_until: "2030-01-01" }), true)).toBe("paid_crypto");
    expect(planState(row({ plan: "whitelisted", unlimited: true }), false)).toBe("whitelisted");
  });
  it("refuses a duplicate card checkout unless a cancel is scheduled", () => {
    expect(cardSubscriptionRunning({ card_status: "active", card_cancels_at: null })).toBe(true);
    expect(cardSubscriptionRunning({ card_status: "past_due", card_cancels_at: null })).toBe(true);
    expect(cardSubscriptionRunning({ card_status: "active", card_cancels_at: "2030-01-01" })).toBe(false);
    expect(cardSubscriptionRunning({ card_status: "canceled", card_cancels_at: null })).toBe(false);
  });
});
