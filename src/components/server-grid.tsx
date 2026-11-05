"use client";

import { linkButtonClass } from "@/lib/button-styles";
import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge, Card, EmptyState, GuildIcon, Input } from "@/components/ui";
import { M } from "@/lib/messages";

export interface ServerCard {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  botPresent: boolean;
  plan: "Free" | "Paid" | "Whitelisted";
  inviteHref: string;
}

export function ServerGrid({ servers, suffix = "", cta = "Open" }: { servers: ServerCard[]; suffix?: string; cta?: string }) {
  const [q, setQ] = useState("");
  const deferred = useDeferredValue(q);
  const shown = servers.filter((s) => s.name.toLowerCase().includes(deferred.trim().toLowerCase()));

  if (servers.length === 0) return <Card><EmptyState title="No servers yet">{M.noServers}</EmptyState></Card>;
  return (
    <>
      {servers.length > 8 && (
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search servers…" aria-label="Search servers" className="mb-4 max-w-sm" />
      )}
      {shown.length === 0 ? (
        <Card><EmptyState title="No server matches that search" /></Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s) => (
            <li key={s.id}>
              <Card className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <GuildIcon name={s.name} icon={s.icon} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={s.name}>{s.name}</p>
                    <p className="text-xs text-text-muted">{s.owner ? "Owner" : "Admin"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={s.plan === "Free" ? "neutral" : "brand"}>{s.plan}</Badge>
                  {s.botPresent ? (
                    <Badge tone="success" icon={<Check className="h-3 w-3" aria-hidden="true" />}>Bot is in this server</Badge>
                  ) : (
                    <Badge tone="warning">Bot not added</Badge>
                  )}
                </div>
                <div className="mt-auto pt-1">
                  {s.botPresent ? (
                    <Link href={`/servers/${s.id}${suffix}`} className={linkButtonClass("primary", "sm")}>{cta}</Link>
                  ) : (
                    <Link href={`/servers/${s.id}`} className={linkButtonClass("secondary", "sm")}>Add bot</Link>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
