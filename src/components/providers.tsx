"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { setUnauthenticatedHandler } from "@/lib/client-api";

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  const router = useRouter();
  useEffect(() => {
    setUnauthenticatedHandler((path) => router.replace(`/login?next=${encodeURIComponent(path)}`));
    return () => setUnauthenticatedHandler(null);
  }, [router]);
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }));
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange nonce={nonce}>
      <QueryClientProvider client={client}>
        {children}
        <Toaster
          position="bottom-right"
          closeButton
          theme="system"
          toastOptions={{
            classNames: {
              toast: "font-sans! rounded-xl! border! border-border! bg-surface! text-text! shadow-popover!",
              description: "text-text-muted!",
              closeButton: "border-border! bg-surface! text-text-muted!",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
