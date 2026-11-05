import type { Metadata } from "next";
import { BillingActions } from "@/components/billing-actions";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { getBilling, listPayments } from "@/lib/db";
import { cryptoEnabled, getEnv } from "@/lib/env";
import { formatDate, formatUsd } from "@/lib/format";
import { M } from "@/lib/messages";
import { requireGuildPage } from "@/lib/page-auth";
import { DEFAULT_FREE_PER_PLATFORM, pausedByFreePlan, planState, type PlanState } from "@/lib/plans";
import { listAccounts } from "@/lib/db";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const ctx = await requireGuildPage(guildId);
  const env = getEnv();
  const [billing, payments, accounts] = await Promise.all([getBilling(guildId), listPayments(guildId), listAccounts(guildId)]);
  const plan = ctx.plan;
  const everPaid = Boolean(billing?.paid_until) || payments.some((p) => p.status === "paid");
  const state: PlanState = plan
    ? planState(plan, everPaid)
    : billing?.whitelisted ? "whitelisted" : everPaid ? "free_lapsed" : "free_new";
  const pausedN = pausedByFreePlan(accounts, Boolean(plan?.unlimited), DEFAULT_FREE_PER_PLATFORM).size;
  const until = plan?.paid_until ?? billing?.paid_until ?? null;
  const cancelsAt = plan?.card_cancels_at ?? billing?.card_cancels_at ?? null;

  const copy: Record<PlanState, { title: string; body: string; tone: "neutral" | "brand" | "warning" | "danger" }> = {
    free_new: { title: "Free — 1 account per platform", body: "Paid removes the limit: monitor as many accounts per platform as you like (up to 25 per server).", tone: "neutral" },
    free_lapsed: { title: "Free", body: `Your subscription ended on ${formatDate(until)}. ${pausedN} account${pausedN === 1 ? " is" : "s are"} paused. ${M.lapsed}`, tone: "warning" },
    paid_card: { title: "Paid", body: `Renews ${formatDate(until)} by card.`, tone: "brand" },
    paid_card_cancelling: { title: "Cancelled — active until " + formatDate(cancelsAt ?? until), body: "Everything keeps working until then. Resubscribe once it ends.", tone: "warning" },
    paid_card_past_due: { title: "Payment failed", body: "We’ll retry. Update your card to avoid a pause.", tone: "danger" },
    paid_crypto: { title: "Paid", body: `Prepaid until ${formatDate(until)}.`, tone: "brand" },
    whitelisted: { title: "Whitelisted", body: "Unlimited accounts — this server never pays.", tone: "brand" },
  };
  const c = copy[state];
  const price = env.BILLING_PRICE_USD;
  const links = { terms: `${env.SITE_URL}/terms`, privacy: `${env.SITE_URL}/privacy`, refund: `${env.SITE_URL}/refund-policy` };

  return (
    <>
      <PageHeader title="Billing" description="Free is free forever. Paid removes the per-platform limit." />
      <div className="grid gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{c.title}</h2>
            <Badge tone={c.tone}>{state.startsWith("free") ? "Free" : state === "whitelisted" ? "Whitelisted" : "Paid"}</Badge>
          </div>
          <p className="mb-4 mt-1 text-text-muted">{c.body}</p>
          {state.startsWith("free") && (
            <p className="mb-4 text-sm"><strong className="tabular-nums">${price}</strong> per server, per month. Cancel any time.</p>
          )}
          <BillingActions guildId={guildId} state={state} price={price} cryptoEnabled={cryptoEnabled()} links={links} />
        </Card>

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
                      <td className="p-3 tabular-nums">{p.months ?? "—"}</td>
                      <td className="p-3 tabular-nums">{formatUsd(p.amount_usd)}</td>
                      <td className="p-3"><Badge tone={p.status === "paid" ? "success" : p.status === "pending" ? "info" : "danger"}>{p.status[0]?.toUpperCase() + p.status.slice(1)}</Badge></td>
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
            <div><dt className="font-medium">What happens when the subscription ends?</dt><dd className="text-text-muted">One account per platform keeps working; the others are paused. Nothing is deleted and everything resumes instantly when you pay again.</dd></div>
            <div><dt className="font-medium">How do I cancel?</dt><dd className="text-text-muted">Use Manage billing (card payments). You keep Paid until the period ends.</dd></div>
            <div><dt className="font-medium">Refunds?</dt><dd className="text-text-muted">See the <a className="underline" href={links.refund} target="_blank" rel="noopener noreferrer">Refund Policy</a>.</dd></div>
            <div><dt className="font-medium">Taxes?</dt><dd className="text-text-muted">Handled by Polar, our merchant of record.</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
