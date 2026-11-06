"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client-api";

/**
 * Shown briefly when the Discord access token expired. Refreshes it with a normal fetch and then moves on with
 * client-side navigation, so there is no full page load. If refreshing fails the person goes to the login page.
 */
export function SessionRefresh({ next }: { next: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    // Guard against a loop: if we refreshed a moment ago and still ended up here, go to login instead.
    let recent = false;
    try {
      recent = Date.now() - Number(sessionStorage.getItem("dn_refresh_at") ?? 0) < 20_000;
      sessionStorage.setItem("dn_refresh_at", String(Date.now()));
    } catch {
      /* storage unavailable: no loop guard */
    }

    (async () => {
      if (!recent) {
        try {
          const r = await api<{ refreshed: boolean }>("/api/auth/refresh", "POST");
          if (r.refreshed && !cancelled) {
            router.replace(next);
            router.refresh();
            return;
          }
        } catch {
          /* fall through to login */
        }
      }
      if (!cancelled) router.replace(`/login?next=${encodeURIComponent(next)}`);
    })();

    return () => {
      cancelled = true;
    };
  }, [next, router]);

  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh items-center justify-center gap-2 text-text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Reconnecting to Discord…
    </div>
  );
}
