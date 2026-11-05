import { z } from "zod";
import { audit, HttpError, idSchema, parseBody, requireApiGuild, respond } from "@/lib/api";
import { callBot, guildInfo } from "@/lib/bot-jobs";
import { mentionViolation } from "@/lib/permissions";

const body = z.object({
  platform: z.enum(["youtube", "twitch", "kick", "instagram", "twitter", "tiktok"]),
  identifier: z.string().trim().min(1, "Enter the account to monitor.").max(200, "That is too long."),
  channel_id: idSchema,
  mention_role_id: idSchema.nullable().optional(),
});

interface AddResult {
  account: { id: string; platform: string; username: string; platform_account_id: string; channel_id: string };
  webhook_created: boolean;
  webhook_notice?: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return respond(async () => {
    const ctx = await requireApiGuild(req, guildId, { rate: { name: "add", max: 10 } });
    const b = await parseBody(req, body);
    if (b.mention_role_id) {
      const info = await guildInfo(guildId, ctx.userId);
      const role = info.roles.find((r) => r.id === b.mention_role_id);
      if (b.mention_role_id !== guildId && !role) throw new HttpError(400, "bad_request", "That role no longer exists.");
      const msg = mentionViolation({
        roleId: b.mention_role_id,
        guildId,
        roleMentionable: role?.mentionable,
        owner: ctx.guild.o,
        permissions: ctx.guild.p,
      });
      if (msg) throw new HttpError(403, "forbidden", msg);
    }
    const payload: Record<string, unknown> = { platform: b.platform, identifier: b.identifier, channel_id: b.channel_id };
    if (b.mention_role_id) payload.mention_role_id = b.mention_role_id;
    const result = await callBot<AddResult>("add_account", guildId, ctx.userId, payload, { timeoutMs: 20000 });
    await audit(ctx, "account.add", result.account.username, { platform: b.platform });
    return result;
  });
}
