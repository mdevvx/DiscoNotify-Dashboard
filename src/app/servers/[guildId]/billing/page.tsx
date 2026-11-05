import type { Metadata } from "next";
import { Check, CreditCard, Landmark, Sparkles } from "lucide-react";
import { BillingActions } from "@/components/billing-actions";
import { Badge, Banner, Card, EmptyState, PageHeader } from "@/components/ui";
import { getBilling, listAccounts, listPayments } from "@/lib/db";
import { cryptoEnabled, getEnv } from "@/lib/env";
import { formatDate, formatUsd } from "@/lib/format";
import { M } from "@/lib/messages";
import { requireGuildPage } from "@/lib/page-auth";
import { DEFAULT_FREE_PER_PLATFORM, DEFAULT_MAX_ACCOUNTS, pausedByFreePlan, planState, type PlanState } from "@/lib/plans";

export const metadata: Metadata = { title: "Billing" };

const FREE_FEATURES = [
  `${DEFAULT_FREE_PER_PLATFORM} account per platform`,
  "YouTube, Twitch, Kick, Instagram, X and TikTok",
  "Custom messages, mentions and test alerts",
  "Free forever, nothing to sign up for",
];

export default async function BillingPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const ctx = await requireGuildPage(guildId);
  const env = getEnv();
  const [billing, payments, accounts] = await Promise.all([getBilling(guildId), listPayments(guildId), listAccounts(guildId)]);
  const plan = ctx.plan;
  const everPaid = Boolean(billing?.paid_until) || payments.some((p) => p.status === "paid");
  const state: PlanState = plan ? planState(plan, everPaid) : billing?.whitelisted ? "whitelisted" : everPaid ? "free_lapsed" : "free_new";
  const pausedN = pausedByFreePlan(accounts, Boolean(plan?.unlimited), DEFAULT_FREE_PER_PLATFORM).size;
  const until = plan?.paid_until ?? billing?.paid_until ?? null;
  const cancelsAt = plan?.card_cancels_at ?? billing?.card_cancels_at ?? null;
  const isFree = state === "free_new" || state === "free_lapsed";
  const crypto = cryptoEnabled();

  const premiumStatus: Record<Exclude<PlanState, "free_new" | "free_lapsed">, { title: string; body: string; tone: "brand" | "warning" | "danger" }> = {
    paid_card: { title: "You’re on Premium", body: `Renews ${formatDate(until)} by card.`, tone: "brand" },
    paid_card_cancelling: { title: `Cancelled, Premium until ${formatDate(cancelsAt ?? until)}`, body: "Everything keeps working until then. Resubscribe once it ends.", tone: "warning" },
    paid_card_past_due: { title: "Payment failed", body: "We’ll retry. Update your card to avoid a pause.", tone: "danger" },
    paid_crypto: { title: "You’re on Premium", body: `Prepaid until ${formatDate(until)}.`, tone: "brand" },
    whitelisted: { title: "Whitelisted", body: "Unlimited accounts. This server never pays.", tone: "brand" },
  };

  const price = env.BILLING_PRICE_USD;
  const links = { terms: `${env.SITE_URL}/terms`, privacy: `${env.SITE_URL}/privacy`, refund: `${env.SITE_URL}/refund-policy` };

  return (
    <>
      <PageHeader title="Billing" icon={<CreditCard />} description="Free is free forever. Premium removes the per-platform limit." />

      <div className="grid gap-4">
        {state === "free_lapsed" && (
          <Banner tone="warning">
            Your subscription ended on {formatDate(until)}. {pausedN} account{pausedN === 1 ? " is" : "s are"} paused. {M.lapsed}
          </Banner>
        )}

        {isFree ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex flex-col p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Free</h2>
                <Badge>Your plan</Badge>
              </div>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight">$0</span>
                <span className="text-text-muted">forever</span>
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {FREE_FEATURES.map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" /> {t}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="relative flex flex-col overflow-hidden border-brand/50 p-6">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/15 via-transparent to-transparent" />
              <div className="relative flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="size-4 text-primary-text" aria-hidden="true" /> Premium
                </h2>
                <Badge tone="brand">Most popular</Badge>
              </div>
              <p className="relative mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight tabular-nums">${price}</span>
                <span className="text-text-muted">per server, per month</span>
              </p>
              <ul className="relative mt-5 space-y-2.5 text-sm">
                {[
                  `Unlimited accounts per platform (up to ${DEFAULT_MAX_ACCOUNTS} per server)`,
                  "Everything in Free",
                  "Cancel any time, extra accounts simply pause",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> {t}
                  </li>
                ))}
              </ul>

              <div className="relative mt-6 border-t border-border pt-5">
                <p className="mb-3 text-sm font-medium">Pay your way</p>
                <ul className="mb-5 grid gap-2 text-sm text-text-muted">
                  <li className="flex items-center gap-2.5"><CreditCard className="size-4 shrink-0" aria-hidden="true" /> Card: monthly subscription, cancel any time</li>
                  {crypto && <li className="flex items-center gap-2.5"><Landmark className="size-4 shrink-0" aria-hidden="true" /> Crypto: prepaid 3, 6 or 12 months</li>}
                </ul>
                <BillingActions guildId={guildId} state={state} price={price} cryptoEnabled={crypto} links={links} />
              </div>
            </Card>
          </div>
        ) : (
          (() => {
            const c = premiumStatus[state as keyof typeof premiumStatus];
            return (
              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{c.title}</h2>
                  <Badge tone={c.tone}>{state === "whitelisted" ? "Whitelisted" : "Premium"}</Badge>
                </div>
                <p className="mb-4 mt-1 text-text-muted">{c.body}</p>
                <BillingActions guildId={guildId} state={state} price={price} cryptoEnabled={crypto} links={links} />
              </Card>
            );
          })()
        )}

        <Card>
          <h2 className="border-b border-border p-4 font-semibold">Payment history</h2>
          {payments.length === 0 ? (
            <EmptyState title="No payments yet">Payments for this server will be listed here. Receipts come from Polar’s own emails.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-text-muted">
                  <tr><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Method</th><th className="p-3 font-medium">Months</th><th className="p-3 font-medium">Amount</th><th className="p-3 font-medium">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3">{formatDate(p.paid_at ?? p.created_at)}</td>
                      <td className="p-3">{p.provider === "polar" ? "Card" : "Crypto"}</td>
                      <td className="p-3 tabular-nums">{p.months ?? "-"}</td>
                      <td className="p-3 tabular-nums">{formatUsd(p.amount_usd)}</td>
                      <td className="p-3"><Badge tone={p.status === "paid" ? "success" : p.status === "pending" ? "info" : "danger"}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="border-t border-border p-3 text-xs text-text-muted">Receipts are sent by Polar to the email used at checkout.</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Good to know</h2>
          <dl className="space-y-3 text-sm">
            <div><dt className="font-medium">What happens when Premium ends?</dt><dd className="text-text-muted">One account per platform keeps working; the others are paused. Nothing is deleted and everything resumes instantly when you pay again.</dd></div>
            <div><dt className="font-medium">How do I cancel?</dt><dd className="text-text-muted">Use Manage billing (card payments). You keep Premium until the period ends.</dd></div>
            <div><dt className="font-medium">Refunds?</dt><dd className="text-text-muted">See the <a className="underline" href={links.refund} target="_blank" rel="noopener noreferrer">Refund Policy</a>.</dd></div>
            <div><dt className="font-medium">Taxes?</dt><dd className="text-text-muted">Handled by Polar, our merchant of record.</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
