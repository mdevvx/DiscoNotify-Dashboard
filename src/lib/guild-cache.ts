import "server-only";
import type { IronSession } from "iron-session";
import type { SessionData, SessionGuild } from "./session";
import { DiscordError, fetchManageableGuilds } from "./discord";

/**
 * The list of servers a person manages, with names and icons.
 *
 * Names/icons live here (per server instance, keyed by Discord user id) instead of in the cookie. The list is re-read from Discord when
 * older than 10 minutes, so someone who loses Manage Server loses access within 10 minutes.
 *
 * Discord rate limits this endpoint hard and serverless instances don't share memory, so when Discord can't be reached the page falls
 * back (for up to 30 minutes) to a compact copy of the IDs and permissions kept in the encrypted cookie. Pages never fail because of it.
 */
const MAX_AGE_MS = 10 * 60 * 1000;
const FALLBACK_OK_MS = 30 * 60 * 1000;
const MAX_COOKIE_JSON_CHARS = 2200; // keeps the sealed cookie safely under 4 KB (about 50 servers)
export const MIN_FORCE_REFRESH_MS = 30 * 1000;

const cache = new Map<string, { at: number; guilds: SessionGuild[] }>();
const inflight = new Map<string, Promise<SessionGuild[] | null>>();

export function primeGuilds(userId: string, guilds: SessionGuild[]): void {
  cache.set(userId, { at: Date.now(), guilds });
}

/** Stores the compact fallback copy in the session (call from route handlers, then `session.save()`). */
export function rememberGuilds(session: IronSession<SessionData>, guilds: SessionGuild[]): void {
  const list = [...guilds].sort((a, b) => Number(b.o) - Number(a.o)).map((g) => [g.id, g.p, g.o ? 1 : 0] as [string, string, 0 | 1]);
  while (list.length > 1 && JSON.stringify(list).length > MAX_COOKIE_JSON_CHARS) list.pop();
  session.g = list;
  session.gat = Date.now();
}

/** Drops the cached list (the next read hits Discord). Limited to once per 30 s unless `force`. */
export function invalidateGuilds(userId: string, { force = false }: { force?: boolean } = {}): void {
  const hit = cache.get(userId);
  if (!hit) return;
  if (force || Date.now() - hit.at > MIN_FORCE_REFRESH_MS) cache.delete(userId);
}

function fromCookie(session: SessionData): SessionGuild[] | null {
  if (!session.g || !session.gat || Date.now() - session.gat > FALLBACK_OK_MS) return null;
  return session.g.map(([id, p, o]) => ({ id, n: "", i: null, o: o === 1, p }));
}

/**
 * Returns the manageable servers, or `null` when the access token is missing, expired or revoked
 * (the caller then refreshes the token / sends the person through login again).
 */
export async function getManageableGuilds(session: SessionData): Promise<SessionGuild[] | null> {
  const userId = session.user?.id;
  if (!userId) return null;
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < MAX_AGE_MS) return hit.guilds;

  if (!session.at || !session.exp || session.exp < Date.now() + 60_000) return null;
  const token = session.at;

  const running = inflight.get(userId);
  if (running) return running;

  const p = fetchManageableGuilds(token)
    .then((guilds) => {
      primeGuilds(userId, guilds);
      return guilds;
    })
    .catch((e) => {
      if (e instanceof DiscordError && e.status === 401) return null;
      // 429 / 5xx / network: keep the page working from the last known list, briefly.
      const stale = hit && Date.now() - hit.at < FALLBACK_OK_MS ? hit.guilds : fromCookie(session);
      console.error(`[guilds] Discord list unavailable (${e instanceof Error ? e.message : e}); ${stale ? "using fallback list" : "no fallback available"}`);
      if (stale) return stale;
      throw e;
    })
    .finally(() => inflight.delete(userId));
  inflight.set(userId, p);
  return p;
}

export const findGuild = (guilds: SessionGuild[], id: string) => guilds.find((g) => g.id === id);
