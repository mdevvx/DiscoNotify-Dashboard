"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { Button, Dialog } from "@/components/ui";

/** Simple "Log out" button. Asks for confirmation first, then moves to /login without a page reload. */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await api("/api/auth/logout", "POST");
      setOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Couldn’t log out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className={className}>
        <LogOut className="size-4" aria-hidden="true" />
        <span className="max-sm:sr-only">Log out</span>
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)} title="Log out?" description="You’ll need to log in with Discord again to manage your servers.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Stay logged in</Button>
          <Button variant="brand" loading={busy} onClick={go}>Log out</Button>
        </div>
      </Dialog>
    </>
  );
}

/** Re-reads the server list from Discord (limited to once per 30 s on the server) and refreshes the page data in place. */
export function RefreshServers() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await api("/api/auth/refresh", "POST");
      start(() => router.refresh());
    } catch {
      toast.error("Couldn’t refresh your servers. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const loading = busy || pending;
  return (
    <Button onClick={go} disabled={loading}>
      <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" /> Refresh
    </Button>
  );
}
