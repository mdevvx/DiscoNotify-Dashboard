import { linkButtonClass } from "@/lib/button-styles";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, Circle, Radio, ShieldAlert, Users, type LucideIcon } from "lucide-react";
import { BotSwitch } from "@/components/bot-switch";
import { Badge, Card, EmptyState, GuildIcon, PlatformBadge } from "@/components/ui";
import { RelativeTime } from "@/components/relative-time";
import {
  countAlerts, getAccountChannels, getLiveAccountIds, listAccounts, listEvents,
} from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { EVENT_LABELS, M, PLATFORM_META } from "@/lib/messages";
import { requireGuildPage } from "@/lib/page-auth";
import { DEFAULT_FREE_PER_PLATFORM, PLATFORM_KEYS, pausedByFreePlan, platformCounts } from "@/lib/plans";

export const metadata: Metadata = { title: "Overview" };

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

export default async function OverviewPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const ctx = await requireGuildPage(guildId);
  const unlimited = Boolean(ctx.plan?.unlimited);
  const [accounts, channels, day, week, recent] = await Promise.all([
    listAccounts(guildId),
    getAccountChannels(guildId),
    countAlerts(guildId, ago(86_400_000)),
    countAlerts(guildId, ago(7 * 86_400_000)),
    listEvents(guildId, {}, 1, 10),
  ]);
  const live = await getLiveAccountIds(accounts.map((a) => a.id));
  const paused = pausedByFreePlan(accounts, unlimited, DEFAULT_FREE_PER_PLATFORM);
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const counts = platformCounts(accounts);

  // ----- attention list -----
  type Item = { key: string; text: string; href: string; tone: "danger" | "warning" };
  const attention: Item[] = [];
  const accountsHref = `/servers/${guildId}/accounts`;
  for (const a of accounts) {
    const href = `${accountsHref}/${a.id}`;
    const name = `${PLATFORM_META[a.platform]?.name ?? a.platform} · ${a.username}`;
    if (a.status === "invalid") attention.push({ key: `i${a.id}`, text: `${name}: ${M.statusHelp.invalid}`, href, tone: "danger" });
    else if (a.status === "error") attention.push({ key: `e${a.id}`, text: `${name}: ${M.statusHelp.error}`, href, tone: "warning" });
    const ch = channels.get(a.id);
    if (ch && !ch.is_valid) attention.push({ key: `c${a.id}`, text: `${name}: the bot lost access to #${ch.name ?? "the channel"}. Pick another one.`, href, tone: "danger" });
    if (paused.has(a.id)) attention.push({ key: `p${a.id}`, text: `${name} is paused by the free plan.`, href: `/servers/${guildId}/billing`, tone: "warning" });
  }
  if (ctx.plan?.card_status === "past_due") {
    attention.push({ key: "pd", text: "Your card payment failed. Update your card to avoid a pause.", href: `/servers/${guildId}/billing`, tone: "danger" });
  }

  const attentionCount = accounts.filter((a) => a.status === "invalid" || a.status === "error").length;
  const isPaid = unlimited;
  const planName = ctx.plan?.plan === "whitelisted" ? "Whitelisted" : isPaid ? "Premium" : "Free";

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-br from-primary/15 via-transparent to-transparent" />
        <div aria-hidden="true" className="absolute -right-10 -top-16 size-52 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <GuildIcon name={ctx.guildRow?.name ?? "Server"} icon={ctx.guildRow?.icon_url ?? null} size={64} round className="ring-2 ring-border" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{ctx.guildRow?.name ?? "Your server"}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-text-muted">
              <Badge tone={isPaid ? "brand" : "neutral"}>{planName}</Badge>
              {ctx.guildRow?.member_count ? <span>{formatNumber(ctx.guildRow.member_count)} members</span> : null}
              <span>· {accounts.length} account{accounts.length === 1 ? "" : "s"} monitored</span>
            </p>
          </div>
          <Link href={`/servers/${guildId}/accounts`} className={linkButtonClass("primary")}>Manage accounts</Link>
        </div>
      </section>

      <div className="grid gap-4">
        <BotSwitch guildId={guildId} initial={ctx.guildRow?.enabled ?? true} />

        {accounts.length === 0 && (
          <Card className="p-5">
            <h2 className="font-semibold">Getting started</h2>
            <ol className="mt-3 space-y-2.5">
              {[
                ["Add an account to monitor", `/servers/${guildId}/accounts`],
                ["Pick the channel where alerts go (you choose it while adding)", `/servers/${guildId}/accounts`],
                ["Send a test alert from the account page", `/servers/${guildId}/accounts`],
              ].map(([t, href], i) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Circle className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Step {i + 1}: </span>
                    <Link href={href!} className="text-primary-text underline-offset-2 hover:underline">{t}</Link>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Plan</h2>
                <Badge tone={isPaid ? "brand" : "neutral"}>{planName}</Badge>
              </div>
              <p className="mt-1 text-text-muted">
                {planName === "Whitelisted" && "Unlimited accounts, never pays."}
                {planName === "Premium" && `Unlimited accounts per platform${ctx.plan?.paid_until ? ` · paid until ${formatDate(ctx.plan.paid_until)}` : ""}.`}
                {planName === "Free" && "1 account per platform, free forever."}
              </p>
            </div>
            {planName === "Free" && (
              <Link href={`/servers/${guildId}/billing`} className={linkButtonClass("primary")}>
                Get Premium
              </Link>
            )}
          </div>
          {planName === "Free" && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Accounts per platform">
              {PLATFORM_KEYS.map((p) => (
                <li key={p} className="rounded-md border border-border px-2.5 py-1 text-sm">
                  {PLATFORM_META[p]?.name} <span className="font-medium tabular-nums">{counts[p] ?? 0}/{DEFAULT_FREE_PER_PLATFORM}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile icon={Users} label="Accounts monitored" value={formatNumber(accounts.length)} />
          <Tile icon={BellRing} label="Alerts sent" value={`${formatNumber(day)} / ${formatNumber(week)}`} hint="24 hours / 7 days" />
          <Tile icon={Radio} label="Live now" value={formatNumber(live.size)} />
          <Tile icon={ShieldAlert} label="Need attention" value={formatNumber(attentionCount)} tone={attentionCount ? "warning" : undefined} />
        </div>

        <Card>
          <h2 className="border-b border-border p-4 font-semibold">Needs attention</h2>
          {attention.length === 0 ? (
            <p className="flex items-center gap-2 p-4 text-text-muted">
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> Everything looks good.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {attention.map((i) => (
                <li key={i.key}>
                  <Link href={i.href} className="flex min-h-11 items-start gap-2.5 px-4 py-3 hover:bg-surface-raised">
                    <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${i.tone === "danger" ? "text-danger" : "text-warning"}`} aria-hidden="true" />
                    <span className="min-w-0">{i.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-semibold">Recent alerts</h2>
            <Link href={`/servers/${guildId}/activity`} className="text-sm text-primary-text hover:underline">
              View all
            </Link>
          </div>
          {recent.rows.length === 0 ? (
            <EmptyState title="No alerts yet">Alerts appear here once DiscoNotify posts something in Discord.</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {recent.rows.map((e, i) => (
                <li key={`${e.platform_event_id}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <PlatformBadge platform={e.platform} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{byId.get(e.account_id)?.username ?? "Account"}</span>
                    <span className="text-text-muted"> · {EVENT_LABELS[e.event_type] ?? e.event_type}</span>
                    {e.metadata?.title ? <span className="text-text-muted"> · {e.metadata.title}</span> : null}
                  </span>
                  <RelativeTime iso={e.notified_at} className="text-xs text-text-muted" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Tile({ label, value, hint, tone, icon: Icon }: { label: string; value: string; hint?: string; tone?: "warning"; icon: LucideIcon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{label}</p>
        <span aria-hidden="true" className={`flex size-8 items-center justify-center rounded-lg ${tone === "warning" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary-text"}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${tone === "warning" ? "text-warning" : ""}`}>{value}</p>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </Card>
  );
}
