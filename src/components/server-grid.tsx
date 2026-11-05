"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { Crown, Search, Shield } from "lucide-react";
import { cn } from "@/lib/cn";
import { linkButtonClass } from "@/lib/button-styles";
import { M } from "@/lib/messages";
import { Card, EmptyState, GuildIcon } from "@/components/ui";

export interface ServerCard {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  botPresent: boolean;
  plan: "Free" | "Premium" | "Whitelisted";
  inviteHref: string;
}

function ServerTile({ s, suffix, cta }: { s: ServerCard; suffix: string; cta: string }) {
  return (
    <li>
      <div className="group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border border-border bg-surface p-5 text-center transition duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/50">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-primary/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
        <GuildIcon name={s.name} icon={s.icon} size={76} round className="relative ring-2 ring-border transition group-hover:ring-brand/60" />
        <p className="relative mt-3.5 w-full truncate text-[15px] font-semibold" title={s.name}>
          {s.name}
        </p>
        <p className="relative mt-1 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", s.botPresent ? "bg-success" : "bg-warning")} />
          {s.botPresent ? "Bot active" : "Bot not added"}
          <span aria-hidden="true">·</span>
          {s.owner ? <Crown className="size-3" aria-hidden="true" /> : <Shield className="size-3" aria-hidden="true" />}
          {s.owner ? "Owner" : "Admin"}
        </p>
        <p className={cn("relative mt-2 rounded-full px-2 py-0.5 text-[11px] font-medium", s.plan === "Free" ? "bg-surface-raised text-text-muted" : "bg-primary/15 text-primary-text")}>{s.plan}</p>
        <Link
          href={`/servers/${s.id}${s.botPresent ? suffix : ""}`}
          className={cn(linkButtonClass(s.botPresent ? "primary" : "secondary"), "relative mt-4 w-full")}
          aria-label={`${s.botPresent ? cta : "Add DiscoNotify to"} ${s.name}`}
        >
          {s.botPresent ? cta : "Add to server"}
        </Link>
      </div>
    </li>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0" aria-label={title}>
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold">
        {title}
        <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium tabular-nums text-text-muted">{count}</span>
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</ul>
    </section>
  );
}

export function ServerPicker({
  title,
  description,
  action,
  servers,
  suffix = "",
  cta = "Configure",
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  servers: ServerCard[];
  suffix?: string;
  cta?: string;
}) {
  const [q, setQ] = useState("");
  const deferred = useDeferredValue(q).trim().toLowerCase();
  const shown = servers.filter((s) => s.name.toLowerCase().includes(deferred));
  const ready = shown.filter((s) => s.botPresent);
  const addable = shown.filter((s) => !s.botPresent);

  return (
    <>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 text-base text-text-muted sm:text-lg">{description}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="relative block min-w-0 flex-1 sm:w-72 sm:flex-none">
            <span className="sr-only">Search servers</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search servers"
              className="h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 font-mono text-[0.95rem] placeholder:text-text-subtle focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-signal max-sm:h-12"
            />
          </label>
          {action}
        </div>
      </div>

      {servers.length === 0 ? (
        <Card><EmptyState title="No servers yet">{M.noServers}</EmptyState></Card>
      ) : shown.length === 0 ? (
        <Card><EmptyState title="No server matches that search" /></Card>
      ) : (
        <>
          {ready.length > 0 && (
            <Section title="Ready to configure" count={ready.length}>
              {ready.map((s) => <ServerTile key={s.id} s={s} suffix={suffix} cta={cta} />)}
            </Section>
          )}
          {addable.length > 0 && (
            <Section title="Add DiscoNotify to a server" count={addable.length}>
              {addable.map((s) => <ServerTile key={s.id} s={s} suffix={suffix} cta={cta} />)}
            </Section>
          )}
        </>
      )}
    </>
  );
}
