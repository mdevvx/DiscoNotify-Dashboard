import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { applyTokens, exchangeCode, fetchManageableGuilds, fetchMe } from "@/lib/discord";
import { getSession, safeNext } from "@/lib/session";

export async function GET(req: NextRequest) {
  const appUrl = getEnv().APP_URL;
  const fail = (reason: string) => {
    const r = NextResponse.redirect(`${appUrl}/login?error=${reason}`);
    r.cookies.delete("dn_oauth_state");
    r.cookies.delete("dn_oauth_next");
    return r;
  };
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get("dn_oauth_state")?.value;
  if (req.nextUrl.searchParams.get("error")) return fail("denied");
  if (!code || !state || !expected || state !== expected) return fail("state");

  try {
    const tokens = await exchangeCode(code);
    const [me, guilds] = await Promise.all([fetchMe(tokens.access_token), fetchManageableGuilds(tokens.access_token)]);
    const session = await getSession();
    session.user = { id: me.id, username: me.username, global_name: me.global_name, avatar: me.avatar };
    session.guilds = guilds;
    session.guildsFetchedAt = Date.now();
    applyTokens(session, tokens);
    await session.save();
    const res = NextResponse.redirect(`${appUrl}${safeNext(req.cookies.get("dn_oauth_next")?.value)}`);
    res.cookies.delete("dn_oauth_state");
    res.cookies.delete("dn_oauth_next");
    return res;
  } catch {
    return fail("failed");
  }
}
