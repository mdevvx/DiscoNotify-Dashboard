import { z } from "zod";
import { audit, idSchema, loadAccount, parseBody, requireApiGuild, respond } from "@/lib/api";
import { callBot } from "@/lib/bot-jobs";

export async function POST(req: Request, { params }: { params: Promise<{ guildId: string; accountId: string }> }) {
  const { guildId, accountId } = await params;
  return respond(async () => {
    const ctx = await requireApiGuild(req, guildId);
    const account = await loadAccount(guildId, accountId);
    const { channel_id } = await parseBody(req, z.object({ channel_id: idSchema }));
    const r = await callBot<{ channel_id: string; webhook_created: boolean; webhook_notice?: string }>(
      "set_channel",
      guildId,
      ctx.userId,
      { account_id: account.id, channel_id },
    );
    await audit(ctx, "account.channel", account.username, { channel_id });
    return r;
  });
}
