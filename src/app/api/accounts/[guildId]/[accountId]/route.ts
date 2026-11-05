import { z } from "zod";
import { audit, loadAccount, parseBody, requireApiGuild, respond } from "@/lib/api";
import { deleteAccount, setAccountEnabled } from "@/lib/db";

type P = { params: Promise<{ guildId: string; accountId: string }> };

async function load(req: Request, { params }: P) {
  const { guildId, accountId } = await params;
  const ctx = await requireApiGuild(req, guildId);
  const account = await loadAccount(guildId, accountId);
  return { ctx, account };
}

export async function PATCH(req: Request, p: P) {
  return respond(async () => {
    const { ctx, account } = await load(req, p);
    const { enabled } = await parseBody(req, z.object({ enabled: z.boolean() }));
    await setAccountEnabled(ctx.guildId, account.id, enabled);
    await audit(ctx, enabled ? "account.enable" : "account.disable", account.username, { platform: account.platform });
    return { enabled };
  });
}

export async function DELETE(req: Request, p: P) {
  return respond(async () => {
    const { ctx, account } = await load(req, p);
    await deleteAccount(ctx.guildId, account.id);
    await audit(ctx, "account.remove", account.username, { platform: account.platform });
    return { removed: true };
  });
}
