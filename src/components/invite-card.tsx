"use client";

import { linkButtonClass } from "@/lib/button-styles";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { Card } from "@/components/ui";

/** Shown instead of every server page while the bot isn't in the server. Polls until it joins. */
export function InviteCard({ guildId, guildName, href }: { guildId: string; guildName: string; href: string }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const start = () => {
    setWaiting(true);
    setGaveUp(false);
    const until = Date.now() + 120_000;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const r = await api<{ bot_present: boolean }>(`/api/guild/${guildId}/status`);
        if (r.bot_present) {
          if (timer.current) clearInterval(timer.current);
          router.refresh();
          return;
        }
      } catch {
        /* keep polling */
      }
      if (Date.now() > until) {
        if (timer.current) clearInterval(timer.current);
        setWaiting(false);
        setGaveUp(true);
      }
    }, 3000);
  };

  return (
    <Card className="mx-auto mt-8 max-w-lg p-8 text-center">
      <h1 className="text-xl font-semibold">Add DiscoNotify to {guildName}</h1>
      <p className="mt-2 text-text-muted">The bot isn’t in this server yet. Add it, then come back. This page continues by itself.</p>
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={start} className={`${linkButtonClass("primary")} mt-6`}>
        Add DiscoNotify
      </a>
      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-text-muted">
        {waiting && (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Waiting for the bot to join…
          </span>
        )}
        {gaveUp && "Still not here. Finish adding the bot in Discord, then reload this page."}
      </p>
    </Card>
  );
}
