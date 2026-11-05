"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";

/** Logs out and moves to /login with client-side navigation (no full page reload). */
export function LogoutButton({ variant = "icon", className }: { variant?: "icon" | "button"; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await api("/api/auth/logout", "POST");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Couldn’t log out. Please try again.");
      setBusy(false);
    }
  }
  if (variant === "button") {
    return (
      <Button onClick={go} loading={busy} className={className}>
        <LogOut className="size-4" aria-hidden="true" /> Log out
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      aria-label="Log out"
      title="Log out"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-raised hover:text-text disabled:opacity-50 max-sm:size-11",
        className,
      )}
    >
      <LogOut className="size-4" aria-hidden="true" />
    </button>
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
