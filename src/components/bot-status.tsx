"use client";

import { useState } from "react";
import { PauseCircle, Play, Power } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { M } from "@/lib/messages";
import { Badge, Button, Dialog } from "@/components/ui";

/**
 * The server-wide on/off control. Shows the current state clearly, explains what it means, and asks before
 * pausing because pausing stops every alert for the server.
 */
export function BotStatus({ guildId, initial }: { guildId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function change(next: boolean) {
    const prev = on;
    setOn(next); // optimistic
    setBusy(true);
    try {
      await api(`/api/guild/${guildId}/toggle`, "POST", { enabled: next });
      toast.success(next ? "Alerts resumed" : "Alerts paused");
      setConfirming(false);
    } catch (e) {
      setOn(prev); // rollback
      toast.error(e instanceof ApiError ? e.message : M.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="bot-status-title"
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-2xl border p-5 shadow-card transition-colors duration-200",
        on ? "border-border bg-surface" : "border-warning/40 bg-warning/5",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", on ? "bg-ok/15 text-success" : "bg-warning/15 text-warning")}
      >
        {on ? <Power className="size-5" /> : <PauseCircle className="size-5" />}
      </span>

      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="bot-status-title" className="text-base font-semibold">
            {on ? "Alerts are on" : "Alerts are paused"}
          </h2>
          <Badge tone={on ? "success" : "warning"} icon={<span aria-hidden="true" className={cn("size-1.5 rounded-full", on ? "live-dot bg-ok" : "bg-warning")} />}>
            {on ? "Active" : "Paused"}
          </Badge>
        </div>
        <p aria-live="polite" className="mt-1 text-sm text-text-muted">
          {on
            ? "DiscoNotify is watching your accounts and posting alerts in Discord."
            : "Nothing is posted until you resume. Your accounts and settings are kept."}
        </p>
        <p className="mt-0.5 text-[0.82rem] text-text-subtle">{M.changesApply}</p>
      </div>

      {on ? (
        <Button onClick={() => setConfirming(true)} disabled={busy} className="max-sm:w-full">
          <PauseCircle className="size-4" aria-hidden="true" /> Pause alerts
        </Button>
      ) : (
        <Button variant="primary" loading={busy} onClick={() => change(true)} className="max-sm:w-full">
          <Play className="size-4" aria-hidden="true" /> Resume alerts
        </Button>
      )}

      <Dialog
        open={confirming}
        onOpenChange={(o) => !busy && setConfirming(o)}
        title="Pause alerts for this server?"
        description="No alerts will be posted for any account until you resume. Your accounts and settings are kept."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>Keep running</Button>
          <Button variant="primary" loading={busy} onClick={() => change(false)}>Pause alerts</Button>
        </div>
      </Dialog>
    </section>
  );
}
