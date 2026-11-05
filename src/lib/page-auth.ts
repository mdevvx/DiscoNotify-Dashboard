import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getGuild, getGuildPlan, type GuildPlanRow, type GuildRow } from "./db";
import { isSnowflake } from "./permissions";
import { findGuild, getSession, guildsStale, type SessionData, type SessionGuild } from "./session";

/** Server-component guard: logged in, and the server list is fresh (otherwise a route handler refreshes it). */
export async function requireSession(): Promise<SessionData & { user: NonNullable<SessionData["user"]> }> {
  const session = await getSession();
  const path = (await headers()).get("x-pathname") ?? "/servers";
  if (!session.user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (guildsStale(session)) redirect(`/api/auth/refresh?next=${encodeURIComponent(path)}`);
  return session as SessionData & { user: NonNullable<SessionData["user"]> };
}

export interface GuildPageCtx {
  userId: string;
  user: NonNullable<SessionData["user"]>;
  guildId: string;
  member: SessionGuild;
  guildRow: GuildRow | null;
  plan: GuildPlanRow | null;
}

/** Someone who does not manage the server gets a 404 (never 403) so IDs cannot be probed. */
export const requireGuildPage = cache(async (guildId: string): Promise<GuildPageCtx> => {
  const session = await requireSession();
  if (!isSnowflake(guildId)) notFound();
  const member = findGuild(session, guildId);
  if (!member) notFound();
  const [guildRow, plan] = await Promise.all([getGuild(guildId), getGuildPlan(guildId)]);
  return { userId: session.user.id, user: session.user, guildId, member, guildRow, plan };
});
