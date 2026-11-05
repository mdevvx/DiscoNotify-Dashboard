import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "./env";
import { DbError, getAccount, getGuild, insertAudit } from "./db";
import { BotError } from "./bot-jobs";
import { refreshSessionTokens } from "./discord";
import { findGuild, getManageableGuilds } from "./guild-cache";
import { isSnowflake } from "./permissions";
import { rateLimit } from "./rate-limit";
import { getSession, type SessionGuild } from "./session";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

/** Same-origin check for mutations (the SameSite cookie is the second layer). */
export function assertSameOrigin(req: Request): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) throw new HttpError(403, "bad_origin", "Request blocked.");
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    throw new HttpError(403, "bad_origin", "Request blocked.");
  }
  const allowed = new Set([new URL(getEnv().APP_URL).host, req.headers.get("host") ?? ""]);
  if (!allowed.has(host)) throw new HttpError(403, "bad_origin", "Request blocked.");
}

export interface RateSpec {
  name: string;
  max: number;
  perGuild?: boolean;
}

export interface GuildCtx {
  userId: string;
  guildId: string;
  guild: SessionGuild;
  ip: string;
}

/**
 * The single gate for every handler that touches a server: session, same-origin, rate limits,
 * server id from the URL checked against the session's manageable list, and bot presence.
 */
export async function requireApiGuild(
  req: Request,
  guildId: string,
  opts: { rate?: RateSpec; needsBot?: boolean } = {},
): Promise<GuildCtx> {
  assertSameOrigin(req);
  const session = await getSession();
  if (!session.user) throw new HttpError(401, "unauthenticated", "Please log in again.");
  const ip = clientIp(req);
  const mutating = req.method !== "GET";
  if (mutating) {
    const g = rateLimit(`mut:${session.user.id}`, 60);
    if (!g.ok) throw new HttpError(429, "rate_limited", "Too many requests, slow down a little.");
  }
  if (opts.rate) {
    const key = `${opts.rate.name}:${opts.rate.perGuild ? guildId : session.user.id}`;
    if (!rateLimit(key, opts.rate.max).ok) throw new HttpError(429, "rate_limited", "Too many requests, try again in a minute.");
  }
  let guilds = await getManageableGuilds(session);
  if (!guilds && (await refreshSessionTokens(session))) guilds = await getManageableGuilds(session);
  if (!guilds) {
    session.destroy();
    throw new HttpError(401, "unauthenticated", "Please log in again.");
  }
  if (!isSnowflake(guildId)) throw new HttpError(404, "not_found", "Not found.");
  const guild = findGuild(guilds, guildId);
  if (!guild) throw new HttpError(404, "not_found", "Not found.");
  if (opts.needsBot !== false) {
    const row = await getGuild(guildId);
    if (!row?.bot_present) throw new HttpError(409, "not_in_server", "Add DiscoNotify to this server first.");
  }
  return { userId: session.user.id, guildId, guild, ip };
}

export async function audit(ctx: GuildCtx, action: string, target: string | null, metadata?: Record<string, unknown>) {
  await insertAudit({ guildId: ctx.guildId, actorId: ctx.userId, action, target, metadata });
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "bad_request", "That request wasn’t understood.");
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw new HttpError(400, "bad_request", r.error.issues[0]?.message ?? "Some fields are invalid.");
  return r.data;
}

function refCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

/** Wraps a handler: success => {ok:true,data}; known errors keep their plain message; the rest get a ref code. */
export async function respond<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: e.status });
    }
    if (e instanceof BotError) {
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: e.code === "bot_offline" ? 504 : 422 });
    }
    const ref = refCode();
    console.error(`[api ${ref}]`, e instanceof DbError ? `db: ${e.message}` : e);
    return NextResponse.json(
      { ok: false, code: "internal", message: `Something went wrong (ref ${ref}).` },
      { status: 500 },
    );
  }
}

/** Looks an account up scoped to the verified server first (guild AND account id together). */
export async function loadAccount(guildId: string, accountId: string) {
  const notFound = new HttpError(404, "not_found", "That account wasn’t found. Refresh the page.");
  if (!z.string().uuid().safeParse(accountId).success) throw notFound;
  const account = await getAccount(guildId, accountId);
  if (!account) throw notFound;
  return account;
}

export const idSchema =z.string().regex(/^\d{15,20}$/, "Invalid ID");
export const uuidSchema = z.string().uuid("Invalid ID");
