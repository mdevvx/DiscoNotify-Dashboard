"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

/** Friendly error panel with a reference code. Never shows a stack trace. */
export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const ref = (error.digest ?? "").slice(0, 8) || "unknown";
  useEffect(() => {
    console.error(`[ui ${ref}]`, error.message);
  }, [error, ref]);
  return (
    <Card className="mx-auto my-12 max-w-md p-8 text-center" role="alert">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-text-muted">We couldn’t load this page. Please try again. If it keeps happening, contact support with this reference.</p>
      <p className="mt-3 font-mono text-xs text-text-muted">ref {ref}</p>
      <Button variant="primary" className="mt-5" onClick={reset}>Retry</Button>
    </Card>
  );
}
