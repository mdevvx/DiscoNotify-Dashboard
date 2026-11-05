import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { getEnv } from "./env";

/** A server the person manages. Kept server-side (see guild-cache.ts), never in the cookie. */
export interface SessionGuild {
  id: string;
  /** name */
  n: string;
  /** icon hash */
  i: string | null;
  /** is owner */
  o: boolean;
  /** permissions bitfield as a decimal string */
  p: string;
}

/** The cookie only holds who you are and your Discord tokens, so it stays far below the 4 KB limit. */
export interface SessionData {
  user?: { id: string; username: string; global_name: string | null; avatar: string | null };
  /** Discord OAuth tokens (the whole cookie is encrypted) */
  at?: string;
  rt?: string;
  /** access token expiry, ms epoch */
  exp?: number;
  /**
   * Compact fallback copy of the manageable servers: [id, permissions, isOwner]. No names or icons, so it stays small (about 45 bytes
   * per server). Used only when Discord can't be reached (rate limited) so a page never fails because of it.
   */
  g?: [string, string, 0 | 1][];
  /** when `g` was read from Discord, ms epoch */
  gat?: number;
}

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

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

/** Only same-site relative paths are allowed as a post-login destination. */
export function safeNext(value: string | null | undefined, fallback = "/servers"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n\\]/.test(value)) return fallback;
  return value;
}
