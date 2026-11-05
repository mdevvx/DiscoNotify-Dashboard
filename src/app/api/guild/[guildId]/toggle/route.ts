import { z } from "zod";
import { audit, parseBody, requireApiGuild, respond } from "@/lib/api";
import { setGuildEnabled } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return respond(async () => {
    const ctx = await requireApiGuild(req, guildId);
    const { enabled } = await parseBody(req, z.object({ enabled: z.boolean() }));
    await setGuildEnabled(guildId, enabled);
    await audit(ctx, enabled ? "bot.enable" : "bot.disable", "server", { enabled });
    return { enabled };
  });
}
