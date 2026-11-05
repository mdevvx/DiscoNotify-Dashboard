import { audit, HttpError, requireApiGuild, respond } from "@/lib/api";
import { getBilling, getGuildPlan } from "@/lib/db";
import { cardSubscriptionRunning } from "@/lib/plans";
import { createCheckout } from "@/lib/polar";

export async function POST(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return respond(async () => {
    const ctx = await requireApiGuild(req, guildId, { rate: { name: "checkout", max: 6 } });
    const [plan, billing] = await Promise.all([getGuildPlan(guildId), getBilling(guildId)]);
    if (plan?.plan === "whitelisted" || billing?.whitelisted) {
      throw new HttpError(409, "bad_request", "This server is whitelisted and never pays.");
    }
    // A second card subscription would double charge.
    if (
      cardSubscriptionRunning({
        card_status: plan?.card_status ?? billing?.card_status ?? null,
        card_cancels_at: plan?.card_cancels_at ?? billing?.card_cancels_at ?? null,
      })
    ) {
      throw new HttpError(409, "already_subscribed", "This server already has a card subscription. Use Manage billing to change it.");
    }
    let checkout: { url: string };
    try {
      checkout = await createCheckout(guildId, ctx.userId);
    } catch {
      throw new HttpError(502, "payment_unavailable", "We couldn’t start the payment. Nothing was charged. Please try again.");
    }
    await audit(ctx, "billing.checkout_started", "server", { provider: "polar" });
    return { url: checkout.url };
  });
}
