import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BellRing, Check, Gauge, SlidersHorizontal } from "lucide-react";
import { DiscordPreview } from "@/components/message-preview";
import { Logo } from "@/components/logo";
import { linkButtonClass } from "@/lib/button-styles";
import { getEnv } from "@/lib/env";
import { PLATFORM_META } from "@/lib/messages";
import { getSession, safeNext } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  denied: "Discord login was cancelled. You can try again whenever you’re ready.",
  state: "That login link expired. Please try again.",
  expired: "That login attempt timed out. Please click the button once more.",
  failed: "We couldn’t log you in with Discord. Please try again.",
};

const PLATFORMS = ["youtube", "twitch", "kick", "instagram", "twitter", "tiktok"] as const;

const POINTS = [
  { icon: BellRing, title: "Alerts that match your community", text: "Uploads, shorts, posts and live streams, posted in the channel you choose." },
  { icon: SlidersHorizontal, title: "Everything in one dashboard", text: "Accounts, channels, pings and message text, with no commands to remember." },
  { icon: Gauge, title: "Free to start", text: "One account per platform is free, forever. Premium removes the limit." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await getSession();
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (session.user) redirect(next);
  const err = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const site = getEnv().SITE_URL;

  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Brand side */}
      <section className="relative isolate hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:gap-12 lg:p-12 xl:p-16">
        <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10 opacity-50" />
        <div aria-hidden="true" className="absolute -bottom-40 -left-32 -z-10 size-136 rounded-full bg-brand/12 blur-3xl" />

        <Logo size={36} className="text-lg" />

        <div className="rise max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Alerts for every creator your community follows.</h1>
          <ul className="mt-8 space-y-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary-text">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-0.5 text-sm text-text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="max-w-lg space-y-5">
          <div aria-hidden="true" className="hidden [@media(min-height:900px)]:block">
            <DiscordPreview platform="twitch" message="{creator} is live: {title} {url}" embed />
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-muted" aria-label="Supported platforms">
            {PLATFORMS.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: PLATFORM_META[p]?.color }} />
                {PLATFORM_META[p]?.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form side */}
      <section className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo size={32} />
        </div>
        <div className="rise mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h2 className="text-3xl font-semibold tracking-tight">Log in</h2>
          <p className="mt-2 text-text-muted">Continue with Discord to manage DiscoNotify for the servers you run.</p>

          {err && ERRORS[err] && (
            <p role="alert" className="mt-6 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
              {ERRORS[err]}
            </p>
          )}

          <a href={`/api/auth/login?next=${encodeURIComponent(next)}`} className={`${linkButtonClass("primary")} mt-6 w-full`}>
            Continue with Discord
          </a>

          <ul className="mt-8 space-y-3 text-sm text-text-muted">
            {["Only servers you manage are shown", "We read your username, avatar and server list, nothing else", "Log out any time to end access"].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="mx-auto max-w-sm text-center text-xs text-text-muted">
          By continuing you agree to the{" "}
          <a className="underline underline-offset-2 hover:text-text" href={`${site}/terms`} target="_blank" rel="noopener noreferrer">
            Terms
          </a>{" "}
          and{" "}
          <a className="underline underline-offset-2 hover:text-text" href={`${site}/privacy`} target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          .{" "}
          <a className="underline underline-offset-2 hover:text-text" href={site}>
            What is DiscoNotify?
          </a>
        </p>
      </section>
    </main>
  );
}
