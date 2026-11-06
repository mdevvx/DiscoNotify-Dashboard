"use client";

import { linkButtonClass } from "@/lib/button-styles";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, ChevronDown, Loader2, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import type { GuildInfo } from "@/lib/bot-jobs";
import { errText, useGuildInfo, type InfoResponse } from "@/lib/use-guild-info";
import { cn } from "@/lib/cn";
import { HAS_EVERYONE_PING } from "@/lib/permissions";
import { EVENT_LABELS, EVENT_OFF_BY_DEFAULT, M, PLACEHOLDERS, PLATFORM_META } from "@/lib/messages";
import { AccountView, StatusChip } from "@/components/accounts-view";
import { DiscordPreview } from "@/components/message-preview";
import { RelativeTime } from "@/components/relative-time";
import { Badge, Button, Card, Dialog, PlatformBadge, Select, Skeleton, Switch, Textarea } from "@/components/ui";

export interface AlertCfg {
  event_type: string;
  enabled: boolean;
  embed_enabled: boolean;
  mention_role_id: string | null;
  custom_message: string | null;
}

const errMsg = errText;

export function AccountSettings({
  guildId, account, initialConfigs, channelDiscordId, channelName, channelValid,
}: {
  guildId: string;
  account: AccountView;
  initialConfigs: AlertCfg[];
  channelDiscordId: string | null;
  channelName: string | null;
  channelValid: boolean;
}) {
  const router = useRouter();
  const { data, error: loadErr, reload } = useGuildInfo(guildId);
  const [configs, setConfigs] = useState(initialConfigs);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [testType, setTestType] = useState(initialConfigs[0]?.event_type ?? "");

  const base = `/api/accounts/${guildId}/${account.id}`;

  async function run<T>(key: string, fn: () => Promise<T>, ok: string): Promise<T | undefined> {
    setBusy(key);
    try {
      const r = await fn();
      toast.success(ok);
      return r;
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function patchAlerts(eventType: string | null, patch: Partial<AlertCfg>) {
    const before = configs;
    setConfigs((cs) => cs.map((c) => (eventType === null || c.event_type === eventType ? { ...c, ...patch } : c))); // optimistic
    try {
      await api(`/api/alerts/${guildId}/${account.id}`, "PUT", { event_type: eventType, patch });
      toast.success("Saved ✓");
      return true;
    } catch (e) {
      setConfigs(before); // rollback
      toast.error(errMsg(e));
      return false;
    }
  }

  return (
    <div className="grid gap-4">
      {/* 1. Header */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <PlatformBadge platform={account.platform} />
              <StatusChip enabled={account.enabled} status={account.status} pausedByPlan={account.pausedByPlan} />
              {account.live && <Badge tone="danger">Live now</Badge>}
            </div>
            <h2 className="truncate text-lg font-semibold" title={account.username}>{account.username}</h2>
            <p className="text-sm text-text-muted">Last checked <RelativeTime iso={account.lastCheckedAt} /></p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label="Alert type for the test" value={testType} onChange={(e) => setTestType(e.target.value)} className="w-auto">
              {configs.map((c) => <option key={c.event_type} value={c.event_type}>{EVENT_LABELS[c.event_type] ?? c.event_type}</option>)}
            </Select>
            <Button loading={busy === "test"} onClick={() => run("test", () => api(`${base}/test`, "POST", { event_type: testType || undefined }), "Test alert sent, nobody was pinged.")}>
              <Send className="size-4" aria-hidden="true" /> Send test alert
            </Button>
            <Button loading={busy === "toggle"} onClick={async () => {
              const r = await run("toggle", () => api(base, "PATCH", { enabled: !account.enabled }), account.enabled ? "Paused" : "Resumed");
              if (r) router.refresh();
            }}>{account.enabled ? "Pause" : "Resume"}</Button>
            <Button variant="danger" onClick={() => setRemoving(true)}>Remove</Button>
          </div>
        </div>
        {account.pausedByPlan && (
          <p className="mt-3 text-sm text-warning">
            This account is paused by the free plan. You can still edit it. <Link href={`/servers/${guildId}/billing`} className="underline">Subscribe</Link> to switch it back on.
          </p>
        )}
      </Card>

      {loadErr && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-danger/40 bg-danger/10 p-4">
          <p className="flex-1">{loadErr}</p>
          <Button onClick={reload}>Try again</Button>
        </div>
      )}

      {/* 2. Channel */}
      <Card className="p-4">
        <h2 className="font-semibold">Where alerts go</h2>
        {!data && !loadErr ? (
          <Skeleton className="mt-3 h-11 max-w-sm" />
        ) : data ? (
          <ChannelPicker info={data.info} current={channelDiscordId} currentName={channelName} valid={channelValid} busy={busy === "channel"} onSave={async (channelId) => {
            const r = await run("channel", () => api<{ webhook_created: boolean }>(`${base}/channel`, "POST", { channel_id: channelId }), "Saved ✓");
            if (r?.webhook_created) {
              toast.info(M.webhookTip(data.info.channels.find((c) => c.id === channelId)?.name ?? "the channel"), { duration: 12000 });
            }
            if (r) router.refresh();
          }} />
        ) : null}
      </Card>

      {/* 3. Alert types */}
      <Card>
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">Alert types</h2>
          <p className="text-sm text-text-muted">{M.changesApply}</p>
        </div>
        {configs.length === 0 ? (
          <p className="p-4 text-text-muted">No alert types are set up for this account yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {configs.map((c) => (
              <AlertRow key={c.event_type} cfg={c} platform={account.platform} data={data} guildId={guildId}
                onToggle={(patch) => patchAlerts(c.event_type, patch)} />
            ))}
          </ul>
        )}
      </Card>

      {/* 4. All alert types at once */}
      {configs.length > 1 && (
        <Card className="space-y-6 p-4">
          <div>
            <h2 className="font-semibold">Apply to all alert types</h2>
            <p className="text-sm text-text-muted">Change who gets pinged, or the message, for every alert type of this account at once.</p>
          </div>
          <PingSelect
            idPrefix="all"
            guildId={guildId}
            data={data}
            value={configs.every((c) => c.mention_role_id === configs[0]?.mention_role_id) ? (configs[0]?.mention_role_id ?? null) : "mixed"}
            onChange={(role) => patchAlerts(null, { mention_role_id: role })}
          />
          <MessageEditor
            idPrefix="all"
            platform={account.platform}
            data={data}
            initialMessage={sameValue(configs.map((c) => c.custom_message)) ?? ""}
            embed={configs.some((c) => c.embed_enabled)}
            onSave={(message) => patchAlerts(null, { custom_message: message })}
          />
        </Card>
      )}

      {/* 6. Preview */}
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">What an alert looks like</h2>
        <DiscordPreview platform={account.platform} message={configs[0]?.custom_message ?? null} embed={configs.some((c) => c.embed_enabled)} />
        <p className="mt-2 text-xs text-text-muted">Sample values. Real alerts use the creator’s actual title and link. {PLATFORM_META[account.platform]?.name} accent colour shown on the embed.</p>
      </Card>

      <Dialog open={removing} onOpenChange={setRemoving} title={`Remove ${account.username}?`} description="This also deletes its alert settings and history. This can’t be undone.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(false)}>Cancel</Button>
          <Button variant="danger" loading={busy === "remove"} onClick={async () => {
            const r = await run("remove", () => api(base, "DELETE"), "Account removed");
            if (r) router.push(`/servers/${guildId}/accounts`);
          }}>Remove account</Button>
        </div>
      </Dialog>
    </div>
  );
}

function sameValue<T>(vals: T[]): T | null {
  const first = vals[0];
  return vals.every((v) => v === first) ? (first ?? null) : null;
}

function ChannelPicker({ info, current, currentName, valid, busy, onSave }: { info: GuildInfo; current: string | null; currentName: string | null; valid: boolean; busy: boolean; onSave: (id: string) => void }) {
  const [value, setValue] = useState(current ?? "");
  return (
    <div className="mt-3 space-y-2">
      {currentName && !valid && <p role="alert" className="text-sm text-danger">The bot lost access to #{currentName}. Pick another one.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Alert channel" value={value} onChange={(e) => setValue(e.target.value)} className="max-w-sm">
          <option value="">Select a channel…</option>
          {info.channels.map((c) => (
            <option key={c.id} value={c.id} disabled={!c.bot_can_send}>#{c.name}{!c.bot_can_send ? " (I can’t post here)" : ""}</option>
          ))}
        </Select>
        <Button variant="primary" loading={busy} disabled={!value || value === current} onClick={() => onSave(value)}>Save channel</Button>
      </div>
    </div>
  );
}

function AlertRow({ cfg, platform, data, guildId, onToggle }: {
  cfg: AlertCfg; platform: string; data: InfoResponse | null; guildId: string;
  onToggle: (patch: Partial<AlertCfg>) => Promise<boolean | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const label = EVENT_LABELS[cfg.event_type] ?? cfg.event_type;
  const id = `alert-${cfg.event_type}`;
  return (
    <li className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          {EVENT_OFF_BY_DEFAULT.has(cfg.event_type) && <p className="text-xs text-text-muted">Off by default</p>}
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm" htmlFor={`${id}-on`}>
            Send alerts <Switch id={`${id}-on`} checked={cfg.enabled} onCheckedChange={(v) => onToggle({ enabled: v })} />
          </label>
          <label className="flex items-center gap-2 text-sm" htmlFor={`${id}-embed`}>
            Show embed / link preview <Switch id={`${id}-embed`} checked={cfg.embed_enabled} onCheckedChange={(v) => onToggle({ embed_enabled: v })} />
          </label>
        </div>
      </div>

      {/* Who gets pinged is always visible and saves as soon as you choose. It does not need a custom message. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <PingSelect idPrefix={id} guildId={guildId} data={data} value={cfg.mention_role_id} onChange={(role) => onToggle({ mention_role_id: role })} />
        </div>
        <button type="button" aria-expanded={open} aria-controls={`${id}-more`} onClick={() => setOpen((o) => !o)} className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-primary-text hover:bg-surface-raised">
          {cfg.custom_message ? "Edit custom message" : "Customize message"}
          <ChevronDown className={cn("size-4 transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div id={`${id}-more`} className="fade-in border-t border-border pt-4">
          <MessageEditor
            idPrefix={id}
            platform={platform}
            data={data}
            initialMessage={cfg.custom_message ?? ""}
            embed={cfg.embed_enabled}
            onSave={(message) => onToggle({ custom_message: message })}
          />
        </div>
      )}
    </li>
  );
}

/**
 * "Who gets pinged": Nobody, @everyone or a role. Saves immediately on change (and rolls back with a message if it fails).
 * `value` is a role id, null (nobody), or "mixed" when alert types differ (only used by the "all alert types" card).
 */
function PingSelect({ idPrefix, guildId, data, value, onChange }: {
  idPrefix: string; guildId: string; data: InfoResponse | null; value: string | null | "mixed";
  onChange: (role: string | null) => Promise<boolean | undefined>;
}) {
  const [saving, setSaving] = useState(false);
  const can = data?.canMentionEveryone ?? false;
  const lock = (mentionable: boolean) => !mentionable && !can;
  const current = value === "mixed" ? "mixed" : (value ?? "");
  const roleName = data?.info.roles.find((r) => r.id === value)?.name;

  async function pick(next: string) {
    if (next === "mixed" || next === current) return;
    setSaving(true);
    await onChange(next || null);
    setSaving(false);
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-role`} className="flex items-center gap-1.5 text-[0.92rem] font-semibold">
        <BellRing className="size-4 text-text-muted" aria-hidden="true" /> Who gets pinged
        {saving && <Loader2 className="size-3.5 animate-spin text-text-muted" aria-label="Saving" />}
      </label>
      <Select id={`${idPrefix}-role`} value={data ? current : ""} onChange={(e) => pick(e.target.value)} disabled={!data || saving}>
        {!data && <option value="">Loading roles…</option>}
        {data && value === "mixed" && <option value="mixed" disabled>Different for each alert type</option>}
        {data && <option value="">Nobody</option>}
        {data && <option value={data.info.everyone_role_id} disabled={!can}>@everyone{!can ? " 🔒" : ""}</option>}
        {data?.info.roles.filter((r) => !r.managed).map((r) => (
          <option key={r.id} value={r.id} disabled={lock(r.mentionable)}>@{r.name}{lock(r.mentionable) ? " 🔒" : ""}</option>
        ))}
      </Select>
      <p className="text-[0.82rem] text-text-subtle">
        {value === "mixed"
          ? "Pick one to apply it to every alert type."
          : value === guildId
            ? "Everyone in the server is pinged."
            : value
              ? `${roleName ? `@${roleName}` : "That role"} is pinged with each alert.`
              : "Nobody is pinged. Alerts are posted without a mention."}
      </p>
      {data && !can && (
        <p className="flex items-center gap-1.5 text-[0.82rem] text-text-subtle">
          <Lock className="size-3" aria-hidden="true" /> 🔒 options need the “Mention @everyone, @here and All Roles” permission.
        </p>
      )}
    </div>
  );
}

/** The custom message (text, placeholders, live preview). Saved with its own button; independent of the ping role. */
function MessageEditor({ idPrefix, platform, data, initialMessage, embed, onSave }: {
  idPrefix: string; platform: string; data: InfoResponse | null; initialMessage: string; embed: boolean;
  onSave: (message: string | null) => Promise<boolean | undefined>;
}) {
  const [msg, setMsg] = useState(initialMessage);
  const [saved, setSaved] = useState(initialMessage);
  const [saving, setSaving] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const dirty = msg !== saved;
  const can = data?.canMentionEveryone ?? false;
  const pingError = !can && HAS_EVERYONE_PING.test(msg) ? "Only people with the “Mention @everyone, @here and All Roles” permission can use @everyone or @here." : null;

  // Unsaved-changes guard.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  function insert(token: string) {
    const el = ta.current;
    const t = `{${token}}`;
    if (!el) return setMsg((m) => (m + t).slice(0, 1500));
    const s = el.selectionStart ?? msg.length;
    const e2 = el.selectionEnd ?? msg.length;
    const next = (msg.slice(0, s) + t + msg.slice(e2)).slice(0, 1500);
    setMsg(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + t.length, s + t.length); });
  }

  async function save() {
    setSaving(true);
    const ok = await onSave(msg.trim() ? msg : null);
    setSaving(false);
    if (ok) setSaved(msg);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-msg`} className="block text-[0.92rem] font-semibold">Custom message</label>
          <Textarea id={`${idPrefix}-msg`} ref={ta} value={msg} maxLength={1500} onChange={(e) => setMsg(e.target.value)} placeholder="Leave empty to use the default message" aria-describedby={`${idPrefix}-count`} />
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span id={`${idPrefix}-count`} className="tabular-nums">{msg.length}/1500</span>
            <button type="button" className="text-primary-text hover:underline" onClick={() => setMsg("")}>Reset to default</button>
          </div>
          {pingError && <p role="alert" className="text-xs text-danger">{pingError}</p>}
          <div className="flex flex-wrap gap-1.5" aria-label="Insert a placeholder">
            {PLACEHOLDERS.map((p) => (
              <button key={p} type="button" onClick={() => insert(p)} className="rounded-full border border-border px-2 py-0.5 font-mono text-xs hover:bg-surface-raised">{`{${p}}`}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" loading={saving} disabled={!dirty || Boolean(pingError)} onClick={save}>Save message</Button>
          {dirty ? <span className="text-xs text-warning">Unsaved changes</span> : <span className="text-xs text-text-muted">All saved</span>}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Preview</p>
        <DiscordPreview platform={platform} message={msg} embed={embed} />
      </div>
    </div>
  );
}

export { linkButtonClass };
