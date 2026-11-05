"use client";

import { Check, Minus, X } from "lucide-react";
import { useGuildInfo } from "@/lib/use-guild-info";
import { Button, Skeleton } from "@/components/ui";

export function PermissionChecks({ guildId }: { guildId: string }) {
  const { data, error: err, reload } = useGuildInfo(guildId);
  const info = data?.info ?? null;

  if (err) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-danger">{err}</span>
        <Button size="sm" onClick={reload}>Try again</Button>
      </div>
    );
  }
  if (!info) return <div className="space-y-2" aria-busy="true"><Skeleton className="h-5 w-48" /><Skeleton className="h-5 w-56" /><Skeleton className="h-5 w-52" /></div>;

  const canSend = info.channels.some((c) => c.bot_can_send);
  const rows: { label: string; ok: boolean; note?: string }[] = [
    { label: "View Channel", ok: info.channels.length > 0 },
    { label: "Send Messages", ok: canSend, note: canSend ? undefined : "in no channel" },
    { label: "Manage Webhooks", ok: info.bot_permissions.manage_webhooks },
    { label: "Mention Everyone", ok: info.bot_permissions.mention_everyone, note: "only needed for @everyone pings" },
  ];
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-2">
          {r.ok ? <Check className="h-4 w-4 text-success" aria-label="Granted" /> : r.label === "Mention Everyone" ? <Minus className="h-4 w-4 text-warning" aria-label="Not granted" /> : <X className="h-4 w-4 text-danger" aria-label="Missing" />}
          <span>{r.label}</span>
          {r.note && <span className="text-text-muted">· {r.note}</span>}
        </li>
      ))}
    </ul>
  );
}
