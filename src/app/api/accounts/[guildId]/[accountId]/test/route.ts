import { z } from "zod";
import { audit, loadAccount, parseBody, requireApiGuild, respond } from "@/lib/api";
import { callBot } from "@/lib/bot-jobs";

export async function POST(req: Request, { params }: { params: Promise<{ guildId: string; accountId: string }> }) {
  const { guildId, accountId } = await params;
  return respond(async () => {
    const ctx = await requireApiGuild(req, guildId, { rate: { name: "test", max: 5, perGuild: true } });
    const account = await loadAccount(guildId, accountId);
    const { event_type } = await parseBody(req, z.object({ event_type: z.string().regex(/^[a-z_]{3,32}$/).optional() }));
    const payload: Record<string, unknown> = { account_id: account.id };
    if (event_type) payload.event_type = event_type;
    const r = await callBot<{ sent_to: string[] }>("send_test", guildId, ctx.userId, payload);
    await audit(ctx, "message.test", account.username, { event_type: event_type ?? null });
    return r;
  });
}
