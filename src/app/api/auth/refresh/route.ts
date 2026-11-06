import { assertSameOrigin, respond } from "@/lib/api";
import { fetchManageableGuilds, refreshSessionTokens } from "@/lib/discord";
import { invalidateGuilds, primeGuilds, rememberGuilds } from "@/lib/guild-cache";
import { getSession } from "@/lib/session";

async function reload(session: Awaited<ReturnType<typeof getSession>>): Promise<boolean> {
  if (!session.user || !session.at) return false;
  const guilds = await fetchManageableGuilds(session.at);
  primeGuilds(session.user.id, guilds);
  rememberGuilds(session, guilds);
  await session.save();
  return true;
}

/**
 * POST: refreshes the Discord token if needed and re-reads the server list (at most once per 30 s). Returns JSON, so the
 * "Refresh" button and the in-app reconnect page never cause a full page load.
 */
export async function POST(req: Request) {
  return respond(async () => {
    assertSameOrigin(req);
    const session = await getSession();
    if (!session.user) return { refreshed: false };
    if (!(await refreshSessionTokens(session))) {
      session.destroy(); // the refresh token was revoked or expired: log in again
      return { refreshed: false };
    }
    const recent = session.gat && Date.now() - session.gat < 30_000;
    if (!recent) {
      invalidateGuilds(session.user.id, { force: true });
      try {
        await reload(session);
      } catch (e) {
        console.error("[auth] manual refresh failed:", e instanceof Error ? e.message : e);
        return { refreshed: false };
      }
    }
    return { refreshed: true };
  });
}
