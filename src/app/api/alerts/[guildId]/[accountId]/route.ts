import { z } from "zod";
import { audit, HttpError, idSchema, loadAccount, parseBody, requireApiGuild, respond } from "@/lib/api";
import { guildInfo } from "@/lib/bot-jobs";
import { updateAlertConfigs, type AlertPatch } from "@/lib/db";
import { mentionViolation } from "@/lib/permissions";

const body = z.object({
  /** null = every alert type of the account */
  event_type: z
    .string()
    .regex(/^[a-z_]{3,32}$/)
    .nullable(),
  patch: z
    .object({
      enabled: z.boolean().optional(),
      embed_enabled: z.boolean().optional(),
      mention_role_id: idSchema.nullable().optional(),
      custom_message: z.string().max(1500, "Messages can be up to 1500 characters.").nullable().optional(),
    })
    .strict(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ guildId: string; accountId: string }> }) {
  const { guildId, accountId } = await params;
  return respond(async () => {
    const ctx = await requireApiGuild(req, guildId);
    const account = await loadAccount(guildId, accountId);
    const { event_type, patch } = await parseBody(req, body);
    if (Object.keys(patch).length === 0) throw new HttpError(400, "bad_request", "Nothing to change.");

    const clean: AlertPatch = { ...patch };
    if (typeof clean.custom_message === "string" && clean.custom_message.trim() === "") clean.custom_message = null;

    // Mention rule, enforced here as well as in the UI.
    if ("mention_role_id" in patch || "custom_message" in patch) {
      let mentionable: boolean | undefined;
      if (patch.mention_role_id && patch.mention_role_id !== guildId) {
        const info = await guildInfo(guildId, ctx.userId);
        const role = info.roles.find((r) => r.id === patch.mention_role_id);
        if (!role) throw new HttpError(400, "bad_request", "That role no longer exists.");
        mentionable = role.mentionable;
      }
      const msg = mentionViolation({
        roleId: "mention_role_id" in patch ? (patch.mention_role_id ?? null) : null,
        guildId,
        roleMentionable: mentionable,
        customMessage: clean.custom_message ?? null,
        owner: ctx.guild.o,
        permissions: ctx.guild.p,
      });
      if (msg) throw new HttpError(403, "forbidden", msg);
    }

    const n = await updateAlertConfigs(guildId, account.id, event_type, clean);
    if (n === 0) throw new HttpError(404, "not_found", "That alert type wasn’t found. Refresh the page.");

    const target = account.username;
    if ("enabled" in patch || "embed_enabled" in patch) {
      await audit(ctx, "alerts.update", target, { event_type, enabled: patch.enabled, embed_enabled: patch.embed_enabled });
    }
    if ("mention_role_id" in patch) {
      await audit(ctx, "mention.update", target, { event_type, mention_role_id: patch.mention_role_id ?? null });
    }
    if ("custom_message" in patch) {
      await audit(ctx, "message.update", target, { event_type, cleared: clean.custom_message === null });
    }
    return { updated: n };
  });
}
