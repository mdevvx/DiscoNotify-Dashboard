import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, respond } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { refreshSessionTokens } from "@/lib/discord";
import { invalidateGuilds } from "@/lib/guild-cache";
import { getSession, safeNext } from "@/lib/session";

/**
 * GET: used only when the Discord token expired while rendering a page (cookies can't be written then).
 *      Refreshes the token and sends the person back where they were.
 * POST: the "Refresh servers" button. Drops the cached server list (at most once per 30 s) and returns JSON, no page reload.
 */
export async function GET(req: NextRequest) {
  const appUrl = getEnv().APP_URL;
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const session = await getSession();
  if (!session.user) return NextResponse.redirect(`${appUrl}/login?next=${encodeURIComponent(next)}`);
  if (!(await refreshSessionTokens(session, { force: true }))) {
    session.destroy();
    return NextResponse.redirect(`${appUrl}/api/auth/login?next=${encodeURIComponent(next)}`);
  }
  invalidateGuilds(session.user.id, { force: true });
  return NextResponse.redirect(`${appUrl}${next}`);
}

export async function POST(req: Request) {
  return respond(async () => {
    assertSameOrigin(req);
    const session = await getSession();
    if (!session.user) return { refreshed: false };
    await refreshSessionTokens(session);
    invalidateGuilds(session.user.id);
    return { refreshed: true };
  });
}
