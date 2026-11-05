import "server-only";
import type { SessionData, SessionGuild } from "./session";
import { DiscordError, fetchManageableGuilds } from "./discord";

/**
 * The list of servers a person manages, with names and icons.
 *
 * It lives here (per server instance, keyed by Discord user id) instead of in the cookie, because a cookie holds ~4 KB and people
 * can manage dozens of servers. The list is re-read from Discord when older than 10 minutes, so someone who loses Manage Server
 * loses access within 10 minutes. On a cold instance the first request simply re-reads it using the token from the cookie.
 */
const MAX_AGE_MS = 10 * 60 * 1000;
const STALE_OK_MS = 30 * 60 * 1000; // if Discord is rate limiting us, serve the last list for a little while
export const MIN_FORCE_REFRESH_MS = 30 * 1000;

const cache = new Map<string, { at: number; guilds: SessionGuild[] }>();
const inflight = new Map<string, Promise<SessionGuild[] | null>>();

export function primeGuilds(userId: string, guilds: SessionGuild[]): void {
  cache.set(userId, { at: Date.now(), guilds });
}

/** Drops the cached list (the next read hits Discord). Limited to once per 30 s unless `force`. */
export function invalidateGuilds(userId: string, { force = false }: { force?: boolean } = {}): void {
  const hit = cache.get(userId);
  if (!hit) return;
  if (force || Date.now() - hit.at > MIN_FORCE_REFRESH_MS) cache.delete(userId);
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
      if (hit && Date.now() - hit.at < STALE_OK_MS) return hit.guilds; // 429 / network: keep serving the last list briefly
      throw e;
    })
    .finally(() => inflight.delete(userId));
  inflight.set(userId, p);
  return p;
}

export const findGuild = (guilds: SessionGuild[], id: string) => guilds.find((g) => g.id === id);
