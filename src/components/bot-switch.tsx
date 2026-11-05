"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { M } from "@/lib/messages";
import { Card, Switch } from "@/components/ui";

export function BotSwitch({ guildId, initial }: { guildId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function change(next: boolean) {
    const prev = on;
    setOn(next); // optimistic
    setBusy(true);
    try {
      await api(`/api/guild/${guildId}/toggle`, "POST", { enabled: next });
      toast.success(next ? "DiscoNotify is on" : "DiscoNotify is paused");
    } catch (e) {
      setOn(prev); // rollback
      toast.error(e instanceof ApiError ? e.message : M.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p id="bot-switch-label" className="font-medium">
          DiscoNotify is <span className={on ? "text-success" : "text-warning"}>{on ? "on" : "paused"}</span> for this server
        </p>
        <p id="bot-switch-desc" className="mt-0.5 text-sm text-text-muted">
          {M.pauseNote}
        </p>
      </div>
      <Switch checked={on} disabled={busy} onCheckedChange={change} aria-labelledby="bot-switch-label" aria-describedby="bot-switch-desc" />
    </Card>
  );
}
