import { NextResponse } from "next/server";
import { clientIp } from "@/lib/api";
import { authorizeUrl } from "@/lib/discord";
import { rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/session";

export async function GET(req: Request) {
  if (!rateLimit(`login:${clientIp(req)}`, 20).ok) {
    return new NextResponse("Too many login attempts. Please wait a minute and try again.", { status: 429 });
  }
  const url = new URL(req.url);
  const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const res = NextResponse.redirect(authorizeUrl(state));
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  res.cookies.set("dn_oauth_state", state, opts);
  res.cookies.set("dn_oauth_next", safeNext(url.searchParams.get("next")), opts);
  // An automatic second attempt (after a spent code) is allowed once; the cookie stops any loop.
  if (url.searchParams.get("retry") === "1") res.cookies.set("dn_oauth_retry", "1", { ...opts, maxAge: 120 });
  return res;
}
