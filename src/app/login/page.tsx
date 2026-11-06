import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { linkButtonClass } from "@/lib/button-styles";
import { cn } from "@/lib/cn";
import { inviteUrl } from "@/lib/discord";
import { getEnv } from "@/lib/env";
import { getSession, safeNext } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  denied: "Discord login was cancelled. You can try again whenever you’re ready.",
  state: "That login link expired. Please try again.",
  expired: "That login attempt timed out. Please click the button once more.",
  failed: "We couldn’t log you in with Discord. Please try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await getSession();
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (session.user) redirect(next);
  const err = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const site = getEnv().SITE_URL;

  return (
    <main id="main" className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-12">
      {/* quiet background: the grid and a little drifting colour */}
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-20 opacity-50" />
      <div aria-hidden="true" className="orb orb-a -left-24 top-1/4 -z-10 size-120 bg-signal/20" />
      <div aria-hidden="true" className="orb orb-b -right-20 bottom-0 -z-10 size-104 bg-twitch/15" />

      <div className="rise w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-9">
        <Logo size={34} />
        <p className="mt-1 text-sm text-text-subtle">Discord alerts for creators</p>

        <h1 className="mt-8 text-2xl font-bold tracking-tight">Log in to DiscoNotify</h1>
        <p className="mt-1.5 text-text-muted">Continue with Discord to manage the servers you run.</p>

        {err && ERRORS[err] && (
          <p role="alert" className="mt-5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {ERRORS[err]}
          </p>
        )}

        <a href={`/api/auth/login?next=${encodeURIComponent(next)}`} className={cn(linkButtonClass("discord", "lg"), "group mt-6 w-full")}>
          Continue with Discord
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
        </a>

        <p className="mt-6 text-center text-sm text-text-muted">
          New to DiscoNotify?{" "}
          <a className="font-semibold text-primary-text underline-offset-2 hover:underline" href={inviteUrl()} target="_blank" rel="noopener noreferrer">
            Add it to a server
          </a>
        </p>
      </div>

      <p className="mt-5 max-w-md text-center text-xs text-text-muted">
        We only read your username, avatar and server list. By continuing you agree to the{" "}
        <a className="underline underline-offset-2 hover:text-text" href={`${site}/terms`} target="_blank" rel="noopener noreferrer">
          Terms
        </a>{" "}
        and{" "}
        <a className="underline underline-offset-2 hover:text-text" href={`${site}/privacy`} target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>
        .
      </p>
    </main>
  );
}
