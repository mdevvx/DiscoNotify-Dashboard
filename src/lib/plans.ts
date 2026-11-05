// Pure plan rules, a mirror of dashboard-database-contract.md section 1. Unit tested.

/** Defaults used by pages that don't call the bot; guild_info carries the live values. */
export const DEFAULT_FREE_PER_PLATFORM = 1;
export const DEFAULT_MAX_ACCOUNTS = 25;

export const PLATFORM_KEYS =["youtube", "twitch", "kick", "instagram", "twitter", "tiktok"] as const;
export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export interface PlanAccountLike {
  id: string;
  platform: string;
  enabled: boolean;
  created_at: string;
}

/**
 * Among a server's *enabled* accounts of each platform, all but the first by (created_at, id)
 * are "paused by the free plan" when the server is not unlimited.
 */
export function pausedByFreePlan(accounts: PlanAccountLike[], unlimited: boolean, freePerPlatform = 1): Set<string> {
  const paused = new Set<string>();
  if (unlimited) return paused;
  const byPlatform = new Map<string, PlanAccountLike[]>();
  for (const a of accounts) {
    if (!a.enabled) continue;
    const list = byPlatform.get(a.platform) ?? [];
    list.push(a);
    byPlatform.set(a.platform, list);
  }
  for (const list of byPlatform.values()) {
    list.sort((a, b) => {
      const ta = Date.parse(a.created_at);
      const tb = Date.parse(b.created_at);
      if (ta !== tb) return ta - tb;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    for (const a of list.slice(freePerPlatform)) paused.add(a.id);
  }
  return paused;
}

export function platformCounts(accounts: { platform: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of accounts) out[a.platform] = (out[a.platform] ?? 0) + 1;
  return out;
}

export function canAddAccount(opts: {
  unlimited: boolean;
  platform: string;
  counts: Record<string, number>;
  total: number;
  freePerPlatform: number;
  maxTotal: number;
}): { ok: true } | { ok: false; reason: "free_limit" | "server_limit" } {
  if (opts.total >= opts.maxTotal) return { ok: false, reason: "server_limit" };
  if (!opts.unlimited && (opts.counts[opts.platform] ?? 0) >= opts.freePerPlatform) {
    return { ok: false, reason: "free_limit" };
  }
  return { ok: true };
}

export type PlanState =
  | "free_new"
  | "free_lapsed"
  | "paid_card"
  | "paid_card_cancelling"
  | "paid_card_past_due"
  | "paid_crypto"
  | "whitelisted";

export interface PlanRow {
  plan: string;
  unlimited: boolean;
  paid_until: string | null;
  card_status: string | null;
  card_cancels_at: string | null;
  has_card_subscription: boolean | null;
}

/** Maps the view row (plus whether the server ever paid) to the billing-page state table. */
export function planState(row: PlanRow, everPaid: boolean): PlanState {
  if (row.plan === "whitelisted") return "whitelisted";
  const paidActive = row.unlimited && row.plan !== "free";
  if (!paidActive) return everPaid || Boolean(row.paid_until) ? "free_lapsed" : "free_new";
  const hasCard =
    Boolean(row.has_card_subscription) || ["active", "past_due", "trialing"].includes(row.card_status ?? "");
  if (hasCard) {
    if (row.card_status === "past_due" || row.plan === "grace") return "paid_card_past_due";
    if (row.card_cancels_at) return "paid_card_cancelling";
    return "paid_card";
  }
  if (row.plan === "grace") return "paid_card_past_due";
  return "paid_crypto";
}

/** A card subscription is running and not scheduled to end: a second checkout would double charge. */
export function cardSubscriptionRunning(row: Pick<PlanRow, "card_status" | "card_cancels_at">): boolean {
  return ["active", "past_due", "trialing"].includes(row.card_status ?? "") && !row.card_cancels_at;
}
