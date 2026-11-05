import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

/**
 * The ONLY module that imports Supabase. Every function takes a `guildId` that the caller has
 * already verified against the session. Snowflakes are always selected as text (`col::text`)
 * because PostgREST sends bigint as JSON numbers, which lose precision above 2^53.
 */

// ---------- types ----------
export interface GuildRow {
  guild_id: string;
  enabled: boolean;
  bot_present: boolean;
  name: string | null;
  icon_url: string | null;
  owner_id: string | null;
  member_count: number | null;
  created_at: string | null;
}

export interface GuildPlanRow {
  guild_id: string;
  name: string | null;
  icon_url: string | null;
  bot_present: boolean;
  enabled: boolean;
  plan: string;
  unlimited: boolean;
  paid_until: string | null;
  card_status: string | null;
  card_cancels_at: string | null;
  has_card_subscription: boolean | null;
}

export interface AccountRow {
  id: string;
  guild_id: string;
  platform: string;
  platform_account_id: string;
  username: string;
  display_name: string | null;
  enabled: boolean;
  status: "active" | "invalid" | "error" | string;
  last_checked_at: string | null;
  consecutive_failures: number;
  created_at: string;
}

export interface AlertConfigRow {
  id: string;
  guild_id: string;
  account_id: string;
  event_type: string;
  enabled: boolean;
  embed_enabled: boolean;
  mention_role_id: string | null;
  custom_message: string | null;
}

export interface ChannelInfo {
  id: string;
  channel_id: string;
  name: string | null;
  is_valid: boolean;
}

export interface EventRow {
  account_id: string;
  platform: string;
  event_type: string;
  platform_event_id: string | null;
  notified_at: string | null;
  metadata: { title?: string; url?: string; category?: string; viewer_count?: number } | null;
}

export interface BillingRow {
  paid_until: string | null;
  whitelisted: boolean;
  card_status: string | null;
  card_cancels_at: string | null;
}

export interface PaymentRow {
  id: string;
  provider: "polar" | "nowpayments" | string;
  months: number | null;
  amount_usd: number | string | null;
  status: "pending" | "paid" | "failed" | "expired" | string;
  created_at: string;
  paid_at: string | null;
}

export interface PlatformHealthRow {
  platform: string;
  status: "healthy" | "degraded" | "error" | "disabled" | string;
}

export interface JobRow {
  id: string;
  status: "queued" | "running" | "done" | "failed" | string;
  result: Record<string, unknown> | null;
}

// ---------- client ----------
// The schema name comes from env at runtime, so the schema generic is widened to `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;
const g = globalThis as unknown as { __dnSupabase?: Client };

function client(): Client {
  const existing = g.__dnSupabase;
  if (existing) return existing;
  const env = getEnv();
  const created: Client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: env.SUPABASE_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  g.__dnSupabase = created;
  return created;
}

export class DbError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

function must<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new DbError(res.error.message, res.error.code);
  return res.data as T;
}

// ---------- select lists (snowflakes cast to text) ----------
const GUILD_COLS = "guild_id::text, enabled, bot_present, name, icon_url, owner_id::text, member_count, created_at";
const PLAN_COLS =
  "guild_id::text, name, icon_url, bot_present, enabled, plan, unlimited, paid_until, card_status, card_cancels_at, has_card_subscription";
const ACCOUNT_COLS =
  "id, guild_id::text, platform, platform_account_id, username, display_name, enabled, status, last_checked_at, consecutive_failures, created_at";
const ALERT_COLS = "id, guild_id::text, account_id, event_type, enabled, embed_enabled, mention_role_id::text, custom_message";

// ---------- preflight ----------
export async function preflight(): Promise<void> {
  const res = await client().from("notify_guild_plans").select("guild_id::text").limit(1);
  if (res.error) {
    throw new DbError(
      `Preflight failed: cannot read notify_guild_plans (${res.error.message}). Is migration 0015 applied and SUPABASE_SCHEMA correct?`,
    );
  }
}

// ---------- guilds ----------
export async function getGuild(guildId: string): Promise<GuildRow | null> {
  const res = await client().from("notify_guilds").select(GUILD_COLS).eq("guild_id", guildId).maybeSingle();
  return must(res) as GuildRow | null;
}

export async function getGuildPlan(guildId: string): Promise<GuildPlanRow | null> {
  const res = await client().from("notify_guild_plans").select(PLAN_COLS).eq("guild_id", guildId).maybeSingle();
  return must(res) as GuildPlanRow | null;
}

export async function getGuildPlans(guildIds: string[]): Promise<Map<string, GuildPlanRow>> {
  const out = new Map<string, GuildPlanRow>();
  if (guildIds.length === 0) return out;
  const res = await client().from("notify_guild_plans").select(PLAN_COLS).in("guild_id", guildIds);
  for (const row of (must(res) ?? []) as unknown as GuildPlanRow[]) out.set(row.guild_id, row);
  return out;
}

export async function setGuildEnabled(guildId: string, enabled: boolean): Promise<void> {
  must(await client().from("notify_guilds").update({ enabled }).eq("guild_id", guildId));
}

// ---------- accounts ----------
export async function listAccounts(guildId: string): Promise<AccountRow[]> {
  const res = await client()
    .from("notify_platform_accounts")
    .select(ACCOUNT_COLS)
    .eq("guild_id", guildId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  return (must(res) ?? []) as unknown as AccountRow[];
}

/** Always scoped by guild AND account id: never look an account up by id alone. */
export async function getAccount(guildId: string, accountId: string): Promise<AccountRow | null> {
  const res = await client()
    .from("notify_platform_accounts")
    .select(ACCOUNT_COLS)
    .eq("guild_id", guildId)
    .eq("id", accountId)
    .maybeSingle();
  return must(res) as AccountRow | null;
}

export async function setAccountEnabled(guildId: string, accountId: string, enabled: boolean): Promise<boolean> {
  const res = await client()
    .from("notify_platform_accounts")
    .update({ enabled })
    .eq("guild_id", guildId)
    .eq("id", accountId)
    .select("id");
  return (must(res) ?? []).length > 0;
}

export async function deleteAccount(guildId: string, accountId: string): Promise<boolean> {
  const res = await client()
    .from("notify_platform_accounts")
    .delete()
    .eq("guild_id", guildId)
    .eq("id", accountId)
    .select("id");
  return (must(res) ?? []).length > 0;
}

export async function deleteAllAccounts(guildId: string): Promise<number> {
  const res = await client().from("notify_platform_accounts").delete().eq("guild_id", guildId).select("id");
  return (must(res) ?? []).length;
}

// ---------- alert configurations ----------
export async function listAlertConfigs(guildId: string, accountId?: string): Promise<AlertConfigRow[]> {
  let q = client().from("notify_alert_configurations").select(ALERT_COLS).eq("guild_id", guildId);
  if (accountId) q = q.eq("account_id", accountId);
  return (must(await q) ?? []) as unknown as AlertConfigRow[];
}

export interface AlertPatch {
  enabled?: boolean;
  embed_enabled?: boolean;
  mention_role_id?: string | null;
  custom_message?: string | null;
}

/** `eventType = null` updates every alert type of the account ("apply to all"). */
export async function updateAlertConfigs(
  guildId: string,
  accountId: string,
  eventType: string | null,
  patch: AlertPatch,
): Promise<number> {
  let q = client()
    .from("notify_alert_configurations")
    .update(patch)
    .eq("guild_id", guildId)
    .eq("account_id", accountId);
  if (eventType) q = q.eq("event_type", eventType);
  return (must(await q.select("id")) ?? []).length;
}

// ---------- channels ----------
export async function getAccountChannels(guildId: string): Promise<Map<string, ChannelInfo>> {
  const c = client();
  const [links, chans] = await Promise.all([
    c.from("notify_account_channels").select("account_id, channel_id").eq("guild_id", guildId),
    c.from("notify_notification_channels").select("id, channel_id::text, name, is_valid").eq("guild_id", guildId),
  ]);
  const byId = new Map<string, ChannelInfo>();
  for (const ch of (must(chans) ?? []) as unknown as ChannelInfo[]) byId.set(String(ch.id), ch);
  const out = new Map<string, ChannelInfo>();
  for (const l of (must(links) ?? []) as unknown as { account_id: string; channel_id: string }[]) {
    const ch = byId.get(String(l.channel_id));
    if (ch && !out.has(l.account_id)) out.set(l.account_id, ch);
  }
  return out;
}

// ---------- live state, health, events ----------
export async function getLiveAccountIds(accountIds: string[]): Promise<Set<string>> {
  if (accountIds.length === 0) return new Set();
  const res = await client().from("notify_live_states").select("account_id, is_live").in("account_id", accountIds);
  return new Set(((must(res) ?? []) as unknown as { account_id: string; is_live: boolean }[]).filter((r) => r.is_live).map((r) => r.account_id));
}

export async function getPlatformHealth(): Promise<PlatformHealthRow[]> {
  const res = await client().from("notify_platform_health").select("platform, status");
  return (must(res) ?? []) as unknown as PlatformHealthRow[];
}

export async function countAlerts(guildId: string, sinceIso: string): Promise<number> {
  const res = await client()
    .from("notify_events")
    .select("account_id", { count: "exact", head: true })
    .eq("guild_id", guildId)
    .eq("notified", true)
    .gte("notified_at", sinceIso);
  if (res.error) throw new DbError(res.error.message, res.error.code);
  return res.count ?? 0;
}

export interface EventFilters {
  platform?: string;
  accountId?: string;
  eventType?: string;
  from?: string;
  to?: string;
}

export async function listEvents(
  guildId: string,
  filters: EventFilters,
  page: number,
  pageSize: number,
): Promise<{ rows: EventRow[]; total: number }> {
  let q = client()
    .from("notify_events")
    .select("account_id, platform, event_type, platform_event_id, notified_at, metadata", { count: "exact" })
    .eq("guild_id", guildId)
    .eq("notified", true);
  if (filters.platform) q = q.eq("platform", filters.platform);
  if (filters.accountId) q = q.eq("account_id", filters.accountId);
  if (filters.eventType) q = q.eq("event_type", filters.eventType);
  if (filters.from) q = q.gte("notified_at", filters.from);
  if (filters.to) q = q.lte("notified_at", filters.to);
  const start = (page - 1) * pageSize;
  const res = await q.order("notified_at", { ascending: false }).range(start, start + pageSize - 1);
  if (res.error) throw new DbError(res.error.message, res.error.code);
  return { rows: (res.data ?? []) as unknown as EventRow[], total: res.count ?? 0 };
}

// ---------- billing ----------
export async function getBilling(guildId: string): Promise<BillingRow | null> {
  const res = await client()
    .from("notify_billing")
    .select("paid_until, whitelisted, card_status, card_cancels_at")
    .eq("guild_id", guildId)
    .maybeSingle();
  return must(res) as BillingRow | null;
}

export async function listPayments(guildId: string, limit = 50): Promise<PaymentRow[]> {
  const res = await client()
    .from("notify_payments")
    .select("id, provider, months, amount_usd, status, created_at, paid_at")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (must(res) ?? []) as unknown as PaymentRow[];
}

export async function getPaymentStatus(guildId: string, externalId: string): Promise<string | null> {
  const res = await client()
    .from("notify_payments")
    .select("status")
    .eq("guild_id", guildId)
    .eq("provider", "nowpayments")
    .eq("external_id", externalId)
    .maybeSingle();
  return (must(res) as { status: string } | null)?.status ?? null;
}

export async function insertPendingCryptoPayment(p: {
  guildId: string;
  externalId: string;
  months: number;
  amountUsd: number;
  requestedBy: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  must(
    await client().from("notify_payments").insert({
      guild_id: p.guildId,
      provider: "nowpayments",
      external_id: p.externalId,
      months: p.months,
      amount_usd: p.amountUsd,
      status: "pending",
      requested_by: p.requestedBy,
      metadata: p.metadata,
    }),
  );
}

export async function upsertCheckoutEmail(guildId: string, email: string, discordUserId: string): Promise<void> {
  const lower = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) return;
  const c = client();
  const existing = await c
    .from("notify_email_contacts")
    .select("email")
    .eq("guild_id", guildId)
    .eq("email", lower)
    .maybeSingle();
  if (must(existing)) return;
  must(
    await c.from("notify_email_contacts").insert({
      guild_id: guildId,
      email: lower,
      discord_user_id: discordUserId,
      source: "checkout",
    }),
  );
}

// ---------- audit ----------
export async function insertAudit(row: {
  guildId: string;
  actorId: string;
  action: string;
  target: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const res = await client().from("notify_audit_logs").insert({
    guild_id: row.guildId,
    actor_id: row.actorId,
    action: row.action,
    target: row.target,
    metadata: row.metadata ?? {},
  });
  // Auditing must never break the change that was already made.
  if (res.error) console.error("[audit] insert failed", res.error.message);
}

// ---------- jobs ----------
export async function insertJob(row: {
  guildId: string;
  userId: string;
  kind: string;
  payload: Record<string, unknown>;
}): Promise<string> {
  const res = await client()
    .from("notify_dashboard_jobs")
    .insert({ guild_id: row.guildId, requested_by: row.userId, kind: row.kind, payload: row.payload })
    .select("id")
    .single();
  return (must(res) as { id: string }).id;
}

export async function getJob(jobId: string): Promise<JobRow | null> {
  const res = await client().from("notify_dashboard_jobs").select("id, status, result").eq("id", jobId).maybeSingle();
  return must(res) as JobRow | null;
}
