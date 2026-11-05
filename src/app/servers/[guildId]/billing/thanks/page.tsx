import { linkButtonClass } from "@/lib/button-styles";
import type { Metadata } from "next";
import Link from "next/link";
import { PlanFlip } from "@/components/billing-actions";
import { Card } from "@/components/ui";
import { upsertCheckoutEmail } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { requireGuildPage } from "@/lib/page-auth";
import { getCheckout, type PolarCheckout } from "@/lib/polar";

export const metadata: Metadata = { title: "Payment status" };
export const dynamic = "force-dynamic"; // never cached: the result depends on Polar right now

type Outcome = "succeeded" | "confirmed" | "open" | "expired" | "failed" | "unknown";

export default async function ThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ guildId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { guildId } = await params;
  const ctx = await requireGuildPage(guildId);
  const sp = await searchParams;
  const raw = sp.checkout_id;
  const id = (Array.isArray(raw) ? raw[0] : raw) ?? "";

  let outcome: Outcome = "open";
  if (id && /^[\w-]{6,80}$/.test(id)) {
    try {
      const checkout: PolarCheckout = await getCheckout(id);
      // Never trust the URL: the checkout must belong to this server.
      if (String(checkout.metadata?.guild_id ?? "") !== guildId) {
        outcome = "unknown";
      } else {
        outcome = (["succeeded", "confirmed", "open", "expired", "failed"].includes(checkout.status) ? checkout.status : "unknown") as Outcome;
        if (outcome === "succeeded" && checkout.customer_email) {
          try {
            await upsertCheckoutEmail(guildId, checkout.customer_email, ctx.userId);
          } catch (e) {
            console.error("[thanks] email upsert failed", e instanceof Error ? e.message : e);
          }
        }
      }
    } catch {
      outcome = "unknown";
    }
  }

  const billing = `/servers/${guildId}/billing`;
  const support = getEnv().SUPPORT_EMAIL;
  const view: Record<Outcome, { icon: string; title: string; body: string; again: boolean }> = {
    succeeded: { icon: "✅", title: "Payment received", body: "Switching your server to Premium, usually under a minute.", again: false },
    confirmed: { icon: "⚠️", title: "Your payment is being processed", body: "Don’t pay again. Check back in a few minutes.", again: false },
    open: { icon: "⚠️", title: "The payment wasn’t completed", body: "You haven’t been charged.", again: true },
    expired: { icon: "⚠️", title: "This checkout expired", body: "Start a new one when you’re ready.", again: true },
    failed: { icon: "❌", title: "The payment didn’t go through", body: "Nothing was charged. Try again or contact support.", again: true },
    unknown: { icon: "❌", title: "We couldn’t confirm your payment", body: `If you were charged, contact ${support} with your email, your payment is safe.`, again: false },
  };
  const v = view[outcome];

  return (
    <Card className="mx-auto mt-6 max-w-lg p-8 text-center">
      <p aria-hidden="true" className="text-3xl">{v.icon}</p>
      <h1 className="mt-2 text-xl font-semibold">{v.title}</h1>
      <p className="mt-2 text-text-muted">{v.body}</p>
      {outcome === "succeeded" && <PlanFlip guildId={guildId} />}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href={billing} className={linkButtonClass(v.again ? "primary" : "secondary")}>{v.again ? "Subscribe" : "Back to billing"}</Link>
        {outcome !== "succeeded" && <a href={`mailto:${support}`} className={linkButtonClass("ghost")}>Contact support</a>}
      </div>
    </Card>
  );
}
