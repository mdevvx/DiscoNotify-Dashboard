import { requireApiGuild, respond } from "@/lib/api";
import { getGuildPlan, getPaymentStatus } from "@/lib/db";

/** Polled after a payment: flips when the bot confirms it. `?payment=<id>` also returns a crypto payment's status. */
export async function GET(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return respond(async () => {
    await requireApiGuild(req, guildId);
    const plan = await getGuildPlan(guildId);
    const pid = new URL(req.url).searchParams.get("payment");
    const payment = pid && /^[\w-]{3,80}$/.test(pid) ? await getPaymentStatus(guildId, pid) : null;
    return { plan: plan?.plan ?? "free", unlimited: Boolean(plan?.unlimited), payment_status: payment };
  });
}
