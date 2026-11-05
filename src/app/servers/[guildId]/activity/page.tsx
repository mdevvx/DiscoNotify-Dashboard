import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button, Card, EmptyState, Input, PageHeader, PlatformBadge, Select } from "@/components/ui";
import { RelativeTime } from "@/components/relative-time";
import { listAccounts, listEvents, type EventFilters } from "@/lib/db";
import { EVENT_LABELS, PLATFORM_META } from "@/lib/messages";
import { requireGuildPage } from "@/lib/page-auth";
import { PLATFORM_KEYS } from "@/lib/plans";

export const metadata: Metadata = { title: "Activity" };

const PAGE_SIZE = 25;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const dateOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function safeUrl(u: string | undefined): string | null {
  if (!u) return null;
  try {
    const p = new URL(u);
    return p.protocol === "https:" || p.protocol === "http:" ? p.toString() : null;
  } catch {
    return null;
  }
}

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ guildId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { guildId } = await params;
  await requireGuildPage(guildId);
  const sp = await searchParams;
  const platform = one(sp.platform);
  const account = one(sp.account);
  const type = one(sp.type);
  const from = one(sp.from);
  const to = one(sp.to);
  const page = Math.max(1, Number.parseInt(one(sp.page) || "1", 10) || 1);

  const filters: EventFilters = {};
  if ((PLATFORM_KEYS as readonly string[]).includes(platform)) filters.platform = platform;
  if (/^[0-9a-f-]{36}$/i.test(account)) filters.accountId = account;
  if (/^[a-z_]{3,32}$/.test(type)) filters.eventType = type;
  if (dateOk(from)) filters.from = new Date(`${from}T00:00:00Z`).toISOString();
  if (dateOk(to)) filters.to = new Date(`${to}T23:59:59Z`).toISOString();

  const [accounts, { rows, total }] = await Promise.all([listAccounts(guildId), listEvents(guildId, filters, page, PAGE_SIZE)]);
  const names = new Map(accounts.map((a) => [a.id, a.username]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const q = new URLSearchParams();
    if (filters.platform) q.set("platform", platform);
    if (filters.accountId) q.set("account", account);
    if (filters.eventType) q.set("type", type);
    if (filters.from) q.set("from", from);
    if (filters.to) q.set("to", to);
    q.set("page", String(p));
    return `?${q.toString()}`;
  };
  const filtered = Object.keys(filters).length > 0;

  return (
    <>
      <PageHeader title="Activity" description="Alerts DiscoNotify has posted in this server." />
      <form method="get" className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" aria-label="Filter alerts">
        <Select name="platform" defaultValue={filters.platform ?? ""} aria-label="Platform">
          <option value="">All platforms</option>
          {PLATFORM_KEYS.map((p) => <option key={p} value={p}>{PLATFORM_META[p]?.name}</option>)}
        </Select>
        <Select name="account" defaultValue={filters.accountId ?? ""} aria-label="Account">
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.username}</option>)}
        </Select>
        <Select name="type" defaultValue={filters.eventType ?? ""} aria-label="Alert type">
          <option value="">All types</option>
          {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Input type="date" name="from" defaultValue={dateOk(from) ? from : ""} aria-label="From date" />
        <Input type="date" name="to" defaultValue={dateOk(to) ? to : ""} aria-label="To date" />
        <div className="flex gap-2">
          <Button type="submit" variant="primary" className="flex-1">Filter</Button>
          {filtered && <Link href="?" className="inline-flex min-h-9 items-center px-2 text-sm text-text-muted hover:text-text">Clear</Link>}
        </div>
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title={filtered ? "No alerts match those filters" : "No alerts yet"}>
            {filtered ? "Try a wider date range or clear the filters." : "Alerts appear here once DiscoNotify posts something in Discord."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((e, i) => {
              const url = safeUrl(e.metadata?.url);
              const title = e.metadata?.title ?? EVENT_LABELS[e.event_type] ?? e.event_type;
              return (
                <li key={`${e.platform_event_id}-${i}`} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                  <div className="flex items-center gap-2"><PlatformBadge platform={e.platform} /></div>
                  <div className="min-w-0">
                    <p className="truncate">
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-medium hover:underline">
                          <span className="truncate">{title}</span><ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </a>
                      ) : <span className="font-medium">{title}</span>}
                    </p>
                    <p className="truncate text-sm text-text-muted">{names.get(e.account_id) ?? "Account"} · {EVENT_LABELS[e.event_type] ?? e.event_type}</p>
                  </div>
                  <RelativeTime iso={e.notified_at} className="text-xs text-text-muted" />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className="min-h-9 py-2 text-primary-text hover:underline">← Newer</Link> : <span />}
          <span className="text-text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className="min-h-9 py-2 text-primary-text hover:underline">Older →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
