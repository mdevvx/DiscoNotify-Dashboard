import { linkButtonClass } from "@/lib/button-styles";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/shell";
import { GuildIcon } from "@/components/ui";
import { avatarUrl } from "@/lib/discord";
import { requireSession } from "@/lib/page-auth";

/** Header for the pages that are not inside a server (picker, billing picker, account). */
export async function TopShell({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const name = s.user.global_name || s.user.username;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-border bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
        <Link href="/servers" aria-label="DiscoNotify, all servers"><Logo /></Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 sm:flex">
          <Link href="/servers" className="rounded-md px-2.5 py-1.5 text-sm text-text-muted hover:bg-surface-raised hover:text-text">Servers</Link>
          <Link href="/billing" className="rounded-md px-2.5 py-1.5 text-sm text-text-muted hover:bg-surface-raised hover:text-text">Billing</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/account" className="flex min-h-9 items-center gap-2 rounded-md px-1.5 hover:bg-surface-raised">
            <GuildIcon name={name} icon={avatarUrl(s.user.id, s.user.avatar)} size={28} />
            <span className="hidden max-w-32 truncate text-sm sm:block">{name}</span>
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

export function RefreshLink({ next }: { next: string }) {
  return (
    <a href={`/api/auth/refresh?force=1&next=${encodeURIComponent(next)}`} className={linkButtonClass("secondary")}>
      <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
    </a>
  );
}

export { ThemeToggle };
