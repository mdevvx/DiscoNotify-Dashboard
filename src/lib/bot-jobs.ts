import "server-only";
import { getJob, insertJob } from "./db";

export type JobKind = "guild_info" | "add_account" | "set_channel" | "send_test" | "billing_portal";

export class BotError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Queue a job for the bot and wait for its answer. Only `message` of a failure is ever shown. */
export async function callBot<T = Record<string, unknown>>(
  kind: JobKind,
  guildId: string,
  userId: string,
  payload: Record<string, unknown> = {},
  { timeoutMs = 15000 }: { timeoutMs?: number } = {},
): Promise<T> {
  const id = await insertJob({ guildId, userId, kind, payload });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(700);
    const job = await getJob(id);
    if (!job) continue;
    if (job.status === "done") return (job.result ?? {}) as T;
    if (job.status === "failed") {
      const r = job.result ?? {};
      throw new BotError(String(r.code ?? "internal"), String(r.message ?? "Something went wrong, please try again."));
    }
  }
  throw new BotError("bot_offline", "DiscoNotify didn’t answer in time. Please try again in a moment.");
}

// ---------- guild_info (cached 60 s per server) ----------
export interface GuildInfo {
  server: { id: string; name: string; icon_url: string | null; member_count: number; owner_id: string };
  everyone_role_id: string;
  channels: { id: string; name: string; category: string | null; is_news: boolean; bot_can_send: boolean; bot_can_manage_webhooks: boolean }[];
  roles: { id: string; name: string; color: string; mentionable: boolean; managed: boolean; position: number }[];
  plan: {
    unlimited: boolean;
    reason: string;
    until: string | null;
    free_accounts_per_platform: number;
    max_accounts_per_server: number;
    price_usd: number;
  };
  platforms: { key: string; name: string; account_label: string; placeholder: string; available: boolean }[];
  bot_permissions: { manage_webhooks: boolean; mention_everyone: boolean };
}

const cache = new Map<string, { at: number; info: GuildInfo }>();
const inflight = new Map<string, Promise<GuildInfo>>();

export async function guildInfo(guildId: string, userId: string, fresh = false): Promise<GuildInfo> {
  const hit = cache.get(guildId);
  if (!fresh && hit && Date.now() - hit.at < 60_000) return hit.info;
  const running = inflight.get(guildId);
  if (running) return running;
  const p = callBot<GuildInfo>("guild_info", guildId, userId)
    .then((info) => {
      cache.set(guildId, { at: Date.now(), info });
      return info;
    })
    .finally(() => inflight.delete(guildId));
  inflight.set(guildId, p);
  return p;
}
