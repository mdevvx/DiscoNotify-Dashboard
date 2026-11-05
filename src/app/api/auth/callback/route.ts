import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { applyTokens, exchangeCode, fetchManageableGuilds, fetchMe, redirectUri } from "@/lib/discord";
import { primeGuilds, rememberGuilds } from "@/lib/guild-cache";
import { getSession, safeNext } from "@/lib/session";

export async function GET(req: NextRequest) {
  const appUrl = getEnv().APP_URL;
  const fail = (reason: string) => {
    const r = NextResponse.redirect(`${appUrl}/login?error=${reason}`);
    r.cookies.delete("dn_oauth_state");
    r.cookies.delete("dn_oauth_next");
    r.cookies.delete("dn_oauth_retry");
    return r;
  };
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get("dn_oauth_state")?.value;
  if (req.nextUrl.searchParams.get("error")) return fail("denied");
  if (!code || !state || !expected || state !== expected) return fail("state");

  const next = `${appUrl}${safeNext(req.cookies.get("dn_oauth_next")?.value)}`;
  const done = () => {
    const r = NextResponse.redirect(next);
    r.cookies.delete("dn_oauth_state");
    r.cookies.delete("dn_oauth_next");
    r.cookies.delete("dn_oauth_retry");
    return r;
  };

  let stage = "token_exchange";
  try {
    const tokens = await exchangeCode(code);
    stage = "discord_api";
    const [me, guilds] = await Promise.all([fetchMe(tokens.access_token), fetchManageableGuilds(tokens.access_token)]);
    stage = "session_save";
    const session = await getSession();
    session.user = { id: me.id, username: me.username, global_name: me.global_name, avatar: me.avatar };
    primeGuilds(me.id, guilds);
    rememberGuilds(session, guilds);
    applyTokens(session, tokens);
    await session.save();
    return done();
  } catch (e) {
    // Logged server side only (no tokens): the usual causes are a redirect_uri that isn't registered in the Discord
    // application, a wrong DISCORD_CLIENT_SECRET, or a cookie over 4 KB.
    const detail = e instanceof Error ? e.message : String(e);
    const status = (e as { status?: number }).status;
    // A used or expired code but the person is already logged in (duplicate request): just continue.
    if (status === 400 && /invalid_grant/.test(detail)) {
      if ((await getSession()).user) return done();
      // The one-time code was spent before this request arrived (a scanner, a browser warning page, a replayed hop).
      // Start the login again once; Discord returns a fresh code straight away because the app is already authorised.
      if (!req.cookies.get("dn_oauth_retry")) {
        console.error("[auth] login code already used or expired; restarting the login once");
        return NextResponse.redirect(`${appUrl}/api/auth/login?retry=1&next=${encodeURIComponent(safeNext(req.cookies.get("dn_oauth_next")?.value))}`);
      }
      console.error(`[auth] login code already used or expired, after a retry. redirect_uri=${redirectUri()}`);
      return fail("expired");
    }
    console.error(`[auth] login failed at ${stage}: ${detail}${status ? ` (HTTP ${status})` : ""}. redirect_uri=${redirectUri()}`);
    return fail("failed");
  }
}
