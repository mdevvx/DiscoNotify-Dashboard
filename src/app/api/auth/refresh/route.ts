import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, respond } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { fetchManageableGuilds, refreshSessionTokens } from "@/lib/discord";
import { invalidateGuilds, primeGuilds, rememberGuilds } from "@/lib/guild-cache";
import { getSession, safeNext } from "@/lib/session";

async function reload(session: Awaited<ReturnType<typeof getSession>>): Promise<boolean> {
  if (!session.user || !session.at) return false;
  const guilds = await fetchManageableGuilds(session.at);
  primeGuilds(session.user.id, guilds);
  rememberGuilds(session, guilds);
  await session.save();
  return true;
}

/**
 * GET: used when the Discord token expired while rendering a page (cookies can't be written then).
 *      Refreshes the token, re-reads the list and sends the person back where they were.
 * POST: the "Refresh servers" button. Re-reads the list (at most once per 30 s) and returns JSON, no page reload.
 */
export async function GET(req: NextRequest) {
  const appUrl = getEnv().APP_URL;
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const session = await getSession();
  if (!session.user) return NextResponse.redirect(`${appUrl}/login?next=${encodeURIComponent(next)}`);
  try {
    if (!(await refreshSessionTokens(session, { force: true }))) throw new Error("token refresh failed");
    invalidateGuilds(session.user.id, { force: true });
    await reload(session);
  } catch (e) {
    console.error("[auth] refresh failed:", e instanceof Error ? e.message : e);
    session.destroy();
    return NextResponse.redirect(`${appUrl}/api/auth/login?next=${encodeURIComponent(next)}`);
  }
  return NextResponse.redirect(`${appUrl}${next}`);
}

export async function POST(req: Request) {
  return respond(async () => {
    assertSameOrigin(req);
    const session = await getSession();
    if (!session.user) return { refreshed: false };
    await refreshSessionTokens(session);
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
