import "server-only";
import type { IronSession } from "iron-session";
import { getEnv } from "./env";
import { canManageGuild } from "./permissions";
import { fitGuilds, type SessionData, type SessionGuild } from "./session";

const API = "https://discord.com/api";

interface DiscordTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface DiscordGuildRaw {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export const redirectUri = () => `${getEnv().APP_URL}/api/auth/callback`;

export function authorizeUrl(state: string): string {
  const env = getEnv();
  const p = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    response_type: "code",
    // identify + guilds only. Never email, guilds.join, messages.read, ...
    scope: "identify guilds",
    redirect_uri: redirectUri(),
    state,
    prompt: "none",
  });
  return `https://discord.com/oauth2/authorize?${p.toString()}`;
}

export function inviteUrl(guildId?: string): string {
  const env = getEnv();
  const p = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    scope: "bot applications.commands",
    permissions: env.DISCORD_BOT_PERMISSIONS,
  });
  if (guildId) {
    p.set("guild_id", guildId);
    p.set("disable_guild_select", "true");
  }
  return `https://discord.com/oauth2/authorize?${p.toString()}`;
}

async function tokenRequest(body: Record<string, string>): Promise<DiscordTokens> {
  const env = getEnv();
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      ...body,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new DiscordError(res.status, "token_request_failed");
  return (await res.json()) as DiscordTokens;
}

export class DiscordError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const exchangeCode = (code: string) =>
  tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri() });

export const refreshTokens = (refreshToken: string) =>
  tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });

export async function revokeToken(token: string, hint: "access_token" | "refresh_token"): Promise<void> {
  const env = getEnv();
  try {
    await fetch(`${API}/oauth2/token/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        token,
        token_type_hint: hint,
      }),
      cache: "no-store",
    });
  } catch {
    // Revocation is best effort: the cookie is cleared regardless.
  }
}

async function bearerGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new DiscordError(res.status, `discord_${res.status}`);
  return (await res.json()) as T;
}

export const fetchMe = (token: string) =>
  bearerGet<{ id: string; username: string; global_name: string | null; avatar: string | null }>("/users/@me", token);

export async function fetchManageableGuilds(token: string): Promise<SessionGuild[]> {
  const raw = await bearerGet<DiscordGuildRaw[]>("/users/@me/guilds", token);
  const list = raw
    .filter((g) => canManageGuild(Boolean(g.owner), g.permissions))
    .map<SessionGuild>((g) => ({ id: g.id, n: g.name, i: g.icon, o: Boolean(g.owner), p: String(g.permissions) }));
  return fitGuilds(list);
}

export function applyTokens(session: SessionData, t: DiscordTokens): void {
  session.at = t.access_token;
  session.rt = t.refresh_token;
  session.exp = Date.now() + t.expires_in * 1000;
}

/**
 * Re-reads the manageable server list from Discord (refreshing the token when needed) and saves it.
 * Returns false when the person must log in again.
 */
export async function refreshGuildList(session: IronSession<SessionData>): Promise<boolean> {
  try {
    if (!session.at || !session.rt) return false;
    if (!session.exp || session.exp < Date.now() + 60_000) {
      applyTokens(session, await refreshTokens(session.rt));
    }
    let guilds: SessionGuild[];
    try {
      guilds = await fetchManageableGuilds(session.at!);
    } catch (e) {
      if (e instanceof DiscordError && e.status === 401) {
        applyTokens(session, await refreshTokens(session.rt!));
        guilds = await fetchManageableGuilds(session.at!);
      } else throw e;
    }
    session.guilds = guilds;
    session.guildsFetchedAt = Date.now();
    await session.save();
    return true;
  } catch {
    return false;
  }
}

export const avatarUrl = (userId: string, hash: string | null) =>
  hash ? `https://cdn.discordapp.com/avatars/${userId}/${hash}.png?size=64` : null;

export const guildIconUrl = (guildId: string, hash: string | null) =>
  hash ? `https://cdn.discordapp.com/icons/${guildId}/${hash}.png?size=64` : null;
