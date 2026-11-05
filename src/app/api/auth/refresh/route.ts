import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { GUILDS_MIN_REFRESH_MS, getSession, safeNext } from "@/lib/session";
import { refreshGuildList } from "@/lib/discord";

/** Re-reads the server list from Discord (also rolls the cookie). Used when the list is stale or on "Refresh". */
export async function GET(req: NextRequest) {
  const appUrl = getEnv().APP_URL;
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const session = await getSession();
  if (!session.user) return NextResponse.redirect(`${appUrl}/login?next=${encodeURIComponent(next)}`);
  const force = req.nextUrl.searchParams.get("force") === "1";
  const recent = session.guildsFetchedAt && Date.now() - session.guildsFetchedAt < GUILDS_MIN_REFRESH_MS;
  if (force && recent) return NextResponse.redirect(`${appUrl}${next}`);
  const ok = await refreshGuildList(session);
  if (!ok) {
    session.destroy();
    return NextResponse.redirect(`${appUrl}/api/auth/login?next=${encodeURIComponent(next)}`);
  }
  return NextResponse.redirect(`${appUrl}${next}`);
}
