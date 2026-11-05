import Link from "next/link";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/session-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { GuildIcon } from "@/components/ui";
import { avatarUrl } from "@/lib/discord";
import { requireSession } from "@/lib/page-auth";

/** Page frame for the screens that are not inside a server (server picker, billing picker). */
export async function TopShell({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const name = s.user.global_name || s.user.username;
  return (
    <div className="relative isolate min-h-dvh">
      <div aria-hidden="true" className="bg-grid absolute inset-x-0 top-0 -z-10 h-96 opacity-60" />
      <header className="glass sticky top-0 z-30 border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-310 items-center gap-3 px-4 sm:px-6">
          <Link href="/servers" aria-label="DiscoNotify, all servers">
            <Logo />
          </Link>
          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 sm:flex">
            <Link href="/servers" className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-raised hover:text-text">Servers</Link>
            <Link href="/billing" className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-raised hover:text-text">Billing</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="mr-1 hidden items-center gap-2 md:flex">
              <GuildIcon name={name} icon={avatarUrl(s.user.id, s.user.avatar)} size={28} round />
              <span className="max-w-32 truncate text-sm text-text-muted">{name}</span>
            </div>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-310 px-4 py-10 sm:px-6 sm:py-14">{children}</main>
    </div>
  );
}
