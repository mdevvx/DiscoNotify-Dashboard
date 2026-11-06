"use client";

import { linkButtonClass } from "@/lib/button-styles";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ExternalLink, PauseCircle, Plus, Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { EVENT_LABELS, M, PLATFORM_META } from "@/lib/messages";
import { useGuildInfo } from "@/lib/use-guild-info";
import { PLATFORM_KEYS } from "@/lib/plans";
import dynamic from "next/dynamic";
import { RelativeTime } from "@/components/relative-time";
import { Badge, Banner, Button, Card, Dialog, EmptyState, PlatformBadge, Skeleton } from "@/components/ui";

// The add dialog (and its bot lookups) is only fetched when someone opens it.
const AddAccountDialog = dynamic(() => import("@/components/add-account-dialog").then((m) => m.AddAccountDialog), { ssr: false });

export interface AccountView {
  id: string;
  platform: string;
  username: string;
  enabled: boolean;
  status: string;
  lastCheckedAt: string | null;
  channelName: string | null;
  channelValid: boolean;
  alertsOn: number;
  alertsTotal: number;
  mention: "none" | "everyone" | "role";
  /** every alert type of the account: whether it is on and which role it pings (null = nobody, guild id = @everyone) */
  alerts: { type: string; enabled: boolean; role: string | null }[];
  pausedByPlan: boolean;
  live: boolean;
}

export function statusOf(a: Pick<AccountView, "enabled" | "status" | "pausedByPlan">) {
  if (!a.enabled) return { label: M.statusLabel.paused, tone: "neutral" as const, icon: PauseCircle };
  if (a.pausedByPlan) return { label: M.statusLabel.pausedFree, tone: "warning" as const, icon: PauseCircle };
  if (a.status === "invalid") return { label: M.statusLabel.invalid, tone: "danger" as const, icon: AlertCircle };
  if (a.status === "error") return { label: M.statusLabel.error, tone: "warning" as const, icon: RefreshCw };
  return { label: M.statusLabel.active, tone: "success" as const, icon: CheckCircle2 };
}

export function StatusChip(props: Pick<AccountView, "enabled" | "status" | "pausedByPlan">) {
  const s = statusOf(props);
  const Icon = s.icon;
  return (
    <Badge tone={s.tone} icon={<Icon className="size-3" aria-hidden="true" />}>
      {s.label}
    </Badge>
  );
}

interface RoleLite {
  id: string;
  name: string;
  color: string;
}

function Detail({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="eyebrow mb-1">{label}</dt>
      <dd className="text-sm text-text">{children}</dd>
    </div>
  );
}

function RolePill({ name, color, everyone = false }: { name: string; color?: string; everyone?: boolean }) {
  const dot = everyone ? "var(--signal)" : color && color !== "#000000" ? color : "var(--text-subtle)";
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-raised/60 px-2.5 py-0.5 text-xs font-medium">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: dot }} />
      <span className="truncate">{everyone ? "@everyone" : `@${name}`}</span>
    </span>
  );
}

/** Who each account pings, with real role names (loaded from the bot; a placeholder shows meanwhile). */
function Pings({ alerts, guildId, roles, loading }: { alerts: AccountView["alerts"]; guildId: string; roles: Map<string, RoleLite>; loading: boolean }) {
  const ids = [...new Set(alerts.filter((a) => a.enabled && a.role).map((a) => a.role as string))];
  if (ids.length === 0) return <span className="text-text-muted">Nobody</span>;
  const needsNames = ids.some((id) => id !== guildId);
  if (needsNames && loading) return <Skeleton className="h-6 w-28 rounded-full" />;
  return (
    <span className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const r = roles.get(id);
        return id === guildId ? <RolePill key={id} name="everyone" everyone /> : <RolePill key={id} name={r?.name ?? "Unknown role"} color={r?.color} />;
      })}
    </span>
  );
}

export function AccountsView({
  guildId, accounts, unlimited, pausedCount, freePerPlatform,
}: {
  guildId: string;
  accounts: AccountView[];
  unlimited: boolean;
  pausedCount: number;
  freePerPlatform: number;
}) {
  const router = useRouter();
  const needsRoles = accounts.some((a) => a.alerts.some((x) => x.enabled && x.role && x.role !== guildId));
  const { data: guildData, error: rolesError } = useGuildInfo(guildId, needsRoles);
  const roles = useMemo(() => new Map((guildData?.info.roles ?? []).map((r) => [r.id, { id: r.id, name: r.name, color: r.color }])), [guildData]);
  const rolesLoading = needsRoles && !guildData && !rolesError;
  const [filter, setFilter] = useState<string>("all");
  const [adding, setAddingState] = useState(false);
  const [addedOnce, setAddedOnce] = useState(false);
  const setAdding = (o: boolean) => {
    if (o) setAddedOnce(true);
    setAddingState(o);
  };
  const [removing, setRemoving] = useState<AccountView | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of accounts) c[a.platform] = (c[a.platform] ?? 0) + 1;
    return c;
  }, [accounts]);
  const shown = filter === "all" ? accounts : accounts.filter((a) => a.platform === filter);

  async function toggle(a: AccountView) {
    setBusyId(a.id);
    try {
      await api(`/api/accounts/${guildId}/${a.id}`, "PATCH", { enabled: !a.enabled });
      toast.success(a.enabled ? `Paused ${a.username}` : `Resumed ${a.username}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : M.genericError);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(a: AccountView) {
    setBusyId(a.id);
    try {
      await api(`/api/accounts/${guildId}/${a.id}`, "DELETE");
      toast.success(`Removed ${a.username}`);
      setRemoving(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : M.genericError);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {pausedCount > 0 && (
        <Banner
          tone="warning"
          action={<Link href={`/servers/${guildId}/billing`} className={linkButtonClass("primary", "sm")}>Subscribe</Link>}
        >
          {M.freeBanner(pausedCount)}
        </Banner>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Platform filter" className="flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={String(accounts.length)} />
          {PLATFORM_KEYS.map((p) => (
            <Chip
              key={p}
              active={filter === p}
              onClick={() => setFilter(p)}
              label={PLATFORM_META[p]?.name ?? p}
              count={unlimited ? String(counts[p] ?? 0) : `${counts[p] ?? 0} / ${freePerPlatform}`}
            />
          ))}
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden="true" /> Add account
        </Button>
      </div>

      <Card>
        {shown.length === 0 ? (
          <EmptyState
            title={accounts.length === 0 ? "No accounts yet" : "Nothing here"}
            action={<Button variant="primary" onClick={() => setAdding(true)}>Add account</Button>}
          >
            {accounts.length === 0
              ? "Add a YouTube, Twitch, Kick, Instagram, X or TikTok account and pick where its alerts go."
              : "No accounts for this platform yet."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((a) => {
              const url = PLATFORM_META[a.platform]?.handleUrl(a.username);
              return (
                <li key={a.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_auto] lg:items-center">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <PlatformBadge platform={a.platform} />
                      {a.live && <Badge tone="danger" icon={<Radio className="size-3" aria-hidden="true" />}>Live now</Badge>}
                      <StatusChip enabled={a.enabled} status={a.status} pausedByPlan={a.pausedByPlan} />
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Link href={`/servers/${guildId}/accounts/${a.id}`} className="truncate font-medium hover:underline" title={a.username}>
                        {a.username}
                      </Link>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${a.username} on ${PLATFORM_META[a.platform]?.name}`} className="text-text-muted hover:text-text">
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                    {(a.status === "invalid" || a.status === "error") && (
                      <p className="text-xs text-text-muted">{a.status === "invalid" ? M.statusHelp.invalid : M.statusHelp.error}</p>
                    )}
                  </div>
                  <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                    <Detail label="Channel">
                      <span className={cn("block truncate", !a.channelValid && a.channelName && "text-danger")} title={a.channelName ?? undefined}>
                        {a.channelName ? `#${a.channelName}${a.channelValid ? "" : " (no access)"}` : "No channel set"}
                      </span>
                    </Detail>
                    <Detail label="Pings">
                      <Pings alerts={a.alerts} guildId={guildId} roles={roles} loading={rolesLoading} />
                    </Detail>
                    <Detail label={`Alert types (${a.alertsOn}/${a.alertsTotal} on)`} wide>
                      {a.alerts.length === 0 ? (
                        <span className="text-text-muted">None set up</span>
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {a.alerts.map((x) => (
                            <span
                              key={x.type}
                              title={x.enabled ? "On" : "Off"}
                              className={cn(
                                "rounded-md border px-2 py-0.5 text-xs font-medium",
                                x.enabled ? "border-border bg-surface-raised text-text" : "border-dashed border-border text-text-subtle line-through",
                              )}
                            >
                              {EVENT_LABELS[x.type] ?? x.type}
                              <span className="sr-only">{x.enabled ? " (on)" : " (off)"}</span>
                            </span>
                          ))}
                        </span>
                      )}
                    </Detail>
                    <Detail label="Last checked">
                      <RelativeTime iso={a.lastCheckedAt} />
                    </Detail>
                  </dl>
                  <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-1 lg:justify-end">
                    <Link href={`/servers/${guildId}/accounts/${a.id}`} className={linkButtonClass("secondary", "sm")}>Settings</Link>
                    <Button size="sm" loading={busyId === a.id} onClick={() => toggle(a)}>{a.enabled ? "Pause" : "Resume"}</Button>
                    <Button size="sm" variant="danger" onClick={() => setRemoving(a)}>Remove</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {(adding || addedOnce) && (
      <AddAccountDialog
        guildId={guildId}
        open={adding}
        onOpenChange={setAdding}
        counts={counts}
        total={accounts.length}
        unlimited={unlimited}
        initialPlatform={filter !== "all" ? filter : undefined}
      />
      )}

      <Dialog open={Boolean(removing)} onOpenChange={(o) => !o && setRemoving(null)} title={`Remove ${removing?.username ?? "account"}?`} description="This also deletes its alert settings and history. This can’t be undone.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
          <Button variant="danger" loading={busyId === removing?.id} onClick={() => removing && remove(removing)}>Remove account</Button>
        </div>
      </Dialog>
    </>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium max-sm:h-11",
        active ? "bg-surface-raised font-medium text-text" : "text-text-muted hover:bg-surface-raised",
      )}
    >
      {label} <span className="tabular-nums text-xs">{count}</span>
    </button>
  );
}
