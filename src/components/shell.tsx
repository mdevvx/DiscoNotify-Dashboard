"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Activity, ChevronsUpDown, CreditCard, ExternalLink, LayoutDashboard, Menu, Search, Settings, Sparkles, UserCircle, Users, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge, Button, Dialog, GuildIcon } from "@/components/ui";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/session-actions";
import { ThemeToggle } from "@/components/theme-toggle";

export interface ShellGuild {
  id: string;
  name: string;
  icon: string | null;
  botPresent: boolean;
}

export interface ShellProps {
  guilds: ShellGuild[];
  current: ShellGuild;
  planLabel: "Free" | "Premium" | "Whitelisted";
  user: { name: string; avatar: string | null };
  siteUrl: string;
  supportEmail: string;
  price: string;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Server",
    items: [
      { href: "", label: "Overview", icon: LayoutDashboard },
      { href: "/accounts", label: "Accounts", icon: Users },
      { href: "/activity", label: "Activity", icon: Activity },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  { label: "Plan", items: [{ href: "/billing", label: "Billing", icon: CreditCard }] },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items);

function titleFor(pathname: string, base: string): string {
  const rest = pathname.slice(base.length);
  if (rest.startsWith("/accounts/")) return "Account settings";
  if (rest.startsWith("/billing/thanks")) return "Payment";
  return ALL_ITEMS.find((i) => i.href === rest || (i.href && rest.startsWith(i.href)))?.label ?? "Overview";
}

function ServerSwitcher({ guilds, current }: Pick<ShellProps, "guilds" | "current">) {
  const router = useRouter();
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button type="button" className="group flex w-full min-w-0 items-center gap-2.5 rounded-xl border border-border bg-surface-raised/60 px-2.5 py-2 text-left transition-colors hover:border-brand/40">
          <GuildIcon name={current.name} icon={current.icon} size={32} round />
          <span className="min-w-0 flex-1 truncate font-medium" title={current.name}>{current.name}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
          <span className="sr-only">Switch server</span>
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="start" sideOffset={6} className="fade-in z-50 max-h-80 w-64 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-popover">
          {guilds.map((g) => (
            <Dropdown.Item
              key={g.id}
              onSelect={() => router.push(`/servers/${g.id}`)}
              className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm outline-hidden data-highlighted:bg-surface-raised"
            >
              <GuildIcon name={g.name} icon={g.icon} size={26} round />
              <span className="min-w-0 flex-1 truncate">{g.name}</span>
              {g.id === current.id && <span className="text-xs text-text-muted">Current</span>}
            </Dropdown.Item>
          ))}
          <Dropdown.Separator className="my-1 h-px bg-border" />
          <Dropdown.Item onSelect={() => router.push("/servers")} className="flex min-h-9 cursor-pointer items-center rounded-lg px-2 text-sm outline-hidden data-highlighted:bg-surface-raised">
            All servers
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

function NavLinks({ base, onNavigate }: { base: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Server" className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const to = `${base}${href}`;
              const active = href === "" ? pathname === base : pathname.startsWith(to);
              return (
                <Link
                  key={label}
                  href={to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-text-muted transition-colors duration-150 hover:bg-surface-raised hover:text-text max-sm:min-h-11",
                    active && "bg-primary/12 text-text before:absolute before:-left-3 before:bottom-2 before:top-2 before:w-0.75 before:rounded-full before:bg-brand",
                  )}
                >
                  <Icon className={cn("size-4", active && "text-primary-text")} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function CommandPalette({ guilds, current }: Pick<ShellProps, "guilds" | "current">) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const router = useRouter();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const items = React.useMemo(() => {
    const base = `/servers/${current.id}`;
    const pages = ALL_ITEMS.map((n) => ({ label: n.label, hint: "Page", href: `${base}${n.href}` }));
    const servers = guilds.map((g) => ({ label: g.name, hint: "Server", href: `/servers/${g.id}` }));
    const all = [...pages, ...servers, { label: "All servers", hint: "Page", href: "/servers" }];
    const s = q.trim().toLowerCase();
    return s ? all.filter((i) => i.label.toLowerCase().includes(s)) : all;
  }, [q, guilds, current.id]);
  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} aria-label="Search (Ctrl+K)" className="gap-2 text-text-muted">
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded-sm border border-border px-1 text-[11px] sm:inline">Ctrl K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }} title="Jump to…" description="Search servers and pages">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && items[active]) go(items[active].href);
          }}
          placeholder="Type to search…"
          aria-label="Search servers and pages"
          className="mb-2 min-h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
        />
        <ul role="listbox" aria-label="Results" className="max-h-72 overflow-y-auto">
          {items.length === 0 && <li className="px-2 py-6 text-center text-text-muted">No results</li>}
          {items.map((i, idx) => (
            <li key={`${i.hint}-${i.href}`} role="option" aria-selected={idx === active}>
              <button type="button" onClick={() => go(i.href)} className={cn("flex min-h-10 w-full items-center justify-between gap-3 rounded-sm px-2 text-left text-sm", idx === active && "bg-surface-raised")}>
                <span className="truncate">{i.label}</span>
                <span className="text-xs text-text-muted">{i.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}

export function ServerShell({ guilds, current, planLabel, user, siteUrl, price, children }: ShellProps) {
  const [drawer, setDrawer] = React.useState(false);
  const pathname = usePathname();
  const base = `/servers/${current.id}`;
  const title = titleFor(pathname, base);

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="space-y-4 p-3 pb-2">
        <Link href="/servers" className="block px-1.5 pt-1" aria-label="DiscoNotify, all servers" onClick={onNavigate}>
          <Logo />
        </Link>
        <ServerSwitcher guilds={guilds} current={current} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <NavLinks base={base} onNavigate={onNavigate} />
      </div>
      <div className="space-y-3 p-3">
        {planLabel === "Free" && (
          <Link
            href={`${base}/billing`}
            onClick={onNavigate}
            className="group relative block overflow-hidden rounded-xl border border-border bg-surface-raised/60 p-3.5 transition-colors hover:border-brand/50"
          >
            <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-brand/25 blur-2xl" />
            <p className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-text">
              <Sparkles className="size-3" aria-hidden="true" /> Premium
            </p>
            <p className="relative mt-1 font-semibold">Raise every limit.</p>
            <p className="relative text-xs text-text-muted">${price}/month per server — see plans</p>
          </Link>
        )}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-raised/40 p-2">
          <GuildIcon name={user.name} icon={user.avatar} size={34} round />
          <p className="min-w-0 flex-1 truncate text-sm font-medium" title={user.name}>{user.name}</p>
          <Link href="/account" onClick={onNavigate} aria-label="Account" title="Account" className="inline-flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-raised hover:text-text max-sm:size-11">
            <UserCircle className="size-4" aria-hidden="true" />
          </Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface lg:block">{sidebar()}</aside>
      <DialogPrimitive.Root open={drawer} onOpenChange={setDrawer}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 lg:hidden" />
          <DialogPrimitive.Content className="fade-in fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] border-r border-border bg-surface pt-[env(safe-area-inset-top)] lg:hidden">
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Server navigation</DialogPrimitive.Description>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu" className="absolute right-2 top-2 z-10">
                <X className="size-4" />
              </Button>
            </DialogPrimitive.Close>
            {sidebar(() => setDrawer(false))}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="lg:pl-64">
        <header className="glass sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-border px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <Menu className="size-5" />
          </Button>
          <p className="truncate text-base font-semibold">{title}</p>
          <Badge tone={planLabel === "Free" ? "neutral" : "brand"} className="hidden sm:inline-flex">{planLabel}</Badge>
          <div className="ml-auto flex items-center gap-2">
            {planLabel === "Free" && (
              <Link
                href={`${base}/billing`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-linear-to-r from-brand to-primary px-3 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_var(--brand)] transition-[filter] hover:brightness-110 max-sm:min-h-11"
              >
                <Sparkles className="size-4" aria-hidden="true" /> Premium
              </Link>
            )}
            <CommandPalette guilds={guilds} current={current} />
            <div className="hidden w-28 md:block"><ThemeToggle /></div>
            <a
              href={`https://discord.com/channels/${current.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-text-muted transition-colors hover:bg-surface-raised hover:text-text xl:inline-flex"
            >
              Open in Discord <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
            <a
              href={`${siteUrl}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-text-muted transition-colors hover:bg-surface-raised hover:text-text sm:inline-flex"
            >
              Documentation <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-275 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
