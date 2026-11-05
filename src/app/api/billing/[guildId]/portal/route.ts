import { audit, requireApiGuild, respond } from "@/lib/api";
import { callBot } from "@/lib/bot-jobs";

export async function POST(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return respond(async () => {
    const ctx = await requireApiGuild(req, guildId, { rate: { name: "portal", max: 6 } });
    const r = await callBot<{ url: string }>("billing_portal", guildId, ctx.userId);
    await audit(ctx, "billing.portal_opened", "server"); // never store the portal URL
    return { url: r.url };
  });
}
