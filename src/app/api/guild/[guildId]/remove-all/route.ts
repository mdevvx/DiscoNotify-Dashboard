import { z } from "zod";
import { audit, HttpError, parseBody, requireApiGuild, respond } from "@/lib/api";
import { deleteAllAccounts } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return respond(async () => {
    const ctx = await requireApiGuild(req, guildId);
    const { confirm } = await parseBody(req, z.object({ confirm: z.string().max(40) }));
    if (confirm.trim().toLowerCase() !== "remove all") {
      throw new HttpError(400, "bad_request", "Type “remove all” to confirm.");
    }
    const removed = await deleteAllAccounts(guildId);
    await audit(ctx, "account.remove", "all accounts", { removed });
    return { removed };
  });
}
