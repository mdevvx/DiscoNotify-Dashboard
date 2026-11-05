import { requireApiGuild, respond } from "@/lib/api";
import { guildInfo } from "@/lib/bot-jobs";
import { canMentionEveryone } from "@/lib/permissions";

export async function GET(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return respond(async () => {
    const ctx = await requireApiGuild(req, guildId);
    const fresh = new URL(req.url).searchParams.get("fresh") === "1";
    const info = await guildInfo(guildId, ctx.userId, fresh);
    return { info, canMentionEveryone: canMentionEveryone(ctx.guild.o, ctx.guild.p) };
  });
}
