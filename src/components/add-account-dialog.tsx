"use client";

import { linkButtonClass } from "@/lib/button-styles";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { useGuildInfo } from "@/lib/use-guild-info";
import { friendlyError, M, UPGRADE_CODES, RETRY_CODES } from "@/lib/messages";
import { Button, Dialog, Field, Select, Input, Skeleton } from "@/components/ui";

export function AddAccountDialog({
  guildId,
  open,
  onOpenChange,
  counts,
  total,
  unlimited,
  initialPlatform,
}: {
  guildId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  counts: Record<string, number>;
  total: number;
  unlimited: boolean;
  initialPlatform?: string;
}) {
  const router = useRouter();
  const { data, error: loadError, reload } = useGuildInfo(guildId, open);
  const [platformChoice, setPlatform] = useState(initialPlatform ?? "");
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState("");
  const [mention, setMention] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ code: string; message: string } | null>(null);

  const info = data?.info;
  const freeLimit = info?.plan.free_accounts_per_platform ?? 1;
  const maxTotal = info?.plan.max_accounts_per_server ?? 25;
  const isUnlimited = info ? info.plan.unlimited : unlimited;
  const platforms = useMemo(() => (info?.platforms ?? []).filter((p) => p.available), [info]);
  const blocked = (key: string) => (!isUnlimited && (counts[key] ?? 0) >= freeLimit) || total >= maxTotal;
  const platform = platformChoice || (platforms.find((p) => !blocked(p.key)) ?? platforms[0])?.key || "";
  const selected = platforms.find((p) => p.key === platform);

  const roleLocked = (mentionable: boolean) => !mentionable && !data?.canMentionEveryone;
  const everyoneLocked = !data?.canMentionEveryone;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!info || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ account: { username: string }; webhook_created: boolean }>(`/api/accounts/${guildId}`, "POST", {
        platform,
        identifier: identifier.trim(),
        channel_id: channel,
        mention_role_id: mention || null,
      });
      toast.success(`Now monitoring ${r.account.username}`);
      if (r.webhook_created) {
        const ch = info.channels.find((c) => c.id === channel)?.name ?? "the channel";
        toast.info(M.webhookTip(ch), { duration: 12000 });
      }
      setIdentifier("");
      onOpenChange(false);
      router.refresh();
    } catch (e2) {
      const ae = e2 as ApiError;
      setErr({ code: ae.code ?? "internal", message: friendlyError(ae.code, ae.message) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add an account" description="Alerts are posted when this account uploads, posts or goes live.">
      {!data && !loadError && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      )}
      {loadError && (
        <div role="alert" className="space-y-3">
          <p className="text-danger">{loadError}</p>
          <Button onClick={reload}>Try again</Button>
        </div>
      )}
      {info && (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Platform" htmlFor="add-platform">
            <Select id="add-platform" value={platform} onChange={(e) => { setPlatform(e.target.value); setErr(null); }} required>
              {platforms.map((p) => (
                <option key={p.key} value={p.key} disabled={blocked(p.key)}>
                  {p.name}
                  {blocked(p.key) ? " — upgrade to add more" : ""}
                </option>
              ))}
            </Select>
          </Field>
          {platform && blocked(platform) && (
            <p role="status" className="text-sm text-warning">
              The free plan monitors {freeLimit} account per platform.{" "}
              <Link href={`/servers/${guildId}/billing`} className="underline">Upgrade</Link> to add more.
            </p>
          )}
          <Field label={selected?.account_label ?? "Account"} htmlFor="add-identifier" hint={selected?.placeholder} error={err && ["account_not_found", "duplicate", "bad_request"].includes(err.code) ? err.message : null}>
            <Input id="add-identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} maxLength={200} required placeholder={selected?.placeholder} autoComplete="off" />
          </Field>
          <Field label="Alert channel" htmlFor="add-channel" hint="Only channels where DiscoNotify can post are selectable.">
            <Select id="add-channel" value={channel} onChange={(e) => setChannel(e.target.value)} required>
              <option value="">Select a channel…</option>
              {info.channels.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.bot_can_send}>
                  #{c.name}
                  {c.category ? ` (${c.category})` : ""}
                  {!c.bot_can_send ? " — I can’t post here" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mention" htmlFor="add-mention" hint={everyoneLocked ? "Pinging @everyone or locked roles needs the “Mention @everyone, @here and All Roles” permission." : undefined}>
            <Select id="add-mention" value={mention} onChange={(e) => setMention(e.target.value)}>
              <option value="">Nobody</option>
              <option value={info.everyone_role_id} disabled={everyoneLocked}>
                @everyone{everyoneLocked ? " 🔒" : ""}
              </option>
              {info.roles.filter((r) => !r.managed).map((r) => (
                <option key={r.id} value={r.id} disabled={roleLocked(r.mentionable)}>
                  @{r.name}{roleLocked(r.mentionable) ? " 🔒" : ""}
                </option>
              ))}
            </Select>
          </Field>
          {everyoneLocked && (
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <Lock className="h-3 w-3" aria-hidden="true" /> Some mentions are locked for your account.
            </p>
          )}

          {err && !["account_not_found", "duplicate", "bad_request"].includes(err.code) && (
            <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">
              <p>{err.message}</p>
              <div className="mt-2 flex gap-2">
                {UPGRADE_CODES.has(err.code) && (
                  <Link href={`/servers/${guildId}/billing`} className={linkButtonClass("primary", "sm")}>Upgrade</Link>
                )}
                {RETRY_CODES.has(err.code) && <Button size="sm" type="submit">Try again</Button>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!platform || blocked(platform) || !channel || !identifier.trim()}>
              Add
            </Button>
          </div>
          <p className="text-xs text-text-muted">{M.changesApply}</p>
        </form>
      )}
    </Dialog>
  );
}
