import { assertSameOrigin, respond } from "@/lib/api";
import { revokeToken } from "@/lib/discord";
import { invalidateGuilds } from "@/lib/guild-cache";
import { getSession } from "@/lib/session";

/** Clears the cookie and revokes the Discord token. Returns JSON; the client then navigates without a page reload. */
export async function POST(req: Request) {
  return respond(async () => {
    assertSameOrigin(req);
    const session = await getSession();
    const { at, rt, user } = session;
    session.destroy();
    if (user) invalidateGuilds(user.id, { force: true });
    if (rt) await revokeToken(rt, "refresh_token");
    if (at) await revokeToken(at, "access_token");
    return { loggedOut: true };
  });
}
