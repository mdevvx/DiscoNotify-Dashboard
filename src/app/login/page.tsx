import { linkButtonClass } from "@/lib/button-styles";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getEnv } from "@/lib/env";
import { getSession, safeNext } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  denied: "Discord login was cancelled.",
  state: "That login link expired. Please try again.",
  failed: "We couldn’t log you in with Discord. Please try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await getSession();
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (session.user) redirect(next);
  const err = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo size={48} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manage DiscoNotify</h1>
        <p className="mt-2 text-text-muted">Log in with Discord to set up alerts for the servers you manage.</p>
      </div>
      {err && ERRORS[err] && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm">{ERRORS[err]}</p>}
      <a href={`/api/auth/login?next=${encodeURIComponent(next)}`} className={`${linkButtonClass("primary")} w-full`}>Log in with Discord</a>
      <a href={getEnv().SITE_URL} className="text-sm text-text-muted underline">What is DiscoNotify?</a>
    </main>
  );
}
