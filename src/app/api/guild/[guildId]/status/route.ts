import { requireApiGuild, respond } from "@/lib/api";
import { getGuild } from "@/lib/db";

/** Polled while waiting for the bot to join (works before the bot is present). */
export async function GET(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return respond(async () => {
    await requireApiGuild(req, guildId, { needsBot: false });
    const row = await getGuild(guildId);
    return { bot_present: Boolean(row?.bot_present) };
  });
}
