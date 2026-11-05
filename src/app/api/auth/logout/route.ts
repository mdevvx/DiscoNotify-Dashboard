import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { revokeToken } from "@/lib/discord";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
  } catch {
    return new NextResponse("Blocked", { status: 403 });
  }
  const session = await getSession();
  const { at, rt } = session;
  session.destroy();
  if (rt) await revokeToken(rt, "refresh_token");
  if (at) await revokeToken(at, "access_token");
  return NextResponse.redirect(`${getEnv().APP_URL}/login`, 303);
}
