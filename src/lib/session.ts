import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { getEnv } from "./env";

/** Compact form of a manageable server, small enough to fit a 4 KB cookie. */
export interface SessionGuild {
  id: string;
  /** name (may be empty if the list had to be trimmed to fit the cookie) */
  n: string;
  /** icon hash */
  i: string | null;
  /** is owner */
  o: boolean;
  /** permissions bitfield as a decimal string */
  p: string;
}

export interface SessionData {
  user?: { id: string; username: string; global_name: string | null; avatar: string | null };
  guilds?: SessionGuild[];
  /** Discord OAuth tokens (the whole cookie is encrypted) */
  at?: string;
  rt?: string;
  /** access token expiry, ms epoch */
  exp?: number;
  guildsFetchedAt?: number;
}

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const GUILDS_MAX_AGE_MS = 10 * 60 * 1000;
export const GUILDS_MIN_REFRESH_MS = 30 * 1000;

export function sessionOptions(): SessionOptions {
  return {
    cookieName: "dn_session",
    password: getEnv().SESSION_SECRET,
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

export function findGuild(session: SessionData, guildId: string): SessionGuild | undefined {
  return session.guilds?.find((g) => g.id === guildId);
}

export function guildsStale(session: SessionData, now = Date.now()): boolean {
  return !session.guildsFetchedAt || now - session.guildsFetchedAt > GUILDS_MAX_AGE_MS;
}

/**
 * Cookies are limited to 4096 bytes after encryption. Degrade gracefully for people who manage
 * many servers: shorter names, then no icons, then no names (names then come from the database).
 */
export function fitGuilds(guilds: SessionGuild[], budgetChars = 1900): SessionGuild[] {
  const size = (g: SessionGuild[]) => JSON.stringify(g).length;
  const attempts: Array<(g: SessionGuild) => SessionGuild> = [
    (g) => g,
    (g) => ({ ...g, n: g.n.slice(0, 18) }),
    (g) => ({ ...g, n: g.n.slice(0, 12), i: null }),
    (g) => ({ ...g, n: "", i: null }),
  ];
  for (const f of attempts) {
    const out = guilds.map(f);
    if (size(out) <= budgetChars) return out;
  }
  // Still too big (roughly 30+ managed servers): keep owned servers first, then as many as fit.
  const out = guilds.map(attempts[3]!).sort((a, b) => Number(b.o) - Number(a.o));
  while (out.length > 1 && size(out) > budgetChars) out.pop();
  return out;
}

/** Only same-site relative paths are allowed as a post-login destination. */
export function safeNext(value: string | null | undefined, fallback = "/servers"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n\\]/.test(value)) return fallback;
  return value;
}
