import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing, Gauge, SlidersHorizontal } from "lucide-react";
import { Logo } from "@/components/logo";
import { linkButtonClass } from "@/lib/button-styles";
import { cn } from "@/lib/cn";
import { inviteUrl } from "@/lib/discord";
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

const INCLUDED = [
  { icon: BellRing, label: "Live alerts" },
  { icon: SlidersHorizontal, label: "Full dashboard" },
  { icon: Gauge, label: "Free to start" },
];

const FEED = [
  { platform: "twitch", creator: "Nova Plays", text: "is live: Final boss tonight", tag: "LIVE", live: true, delay: "0s" },
  { platform: "youtube", creator: "Pixel Kitchen", text: "New video: 5-minute ramen", tag: "VIDEO", live: false, delay: "4s" },
  { platform: "tiktok", creator: "Daily Dev", text: "New post: Tip #42", tag: "POST", live: false, delay: "8s" },
] as const;

/** A looping "live alert" preview: one card at a time slides in, holds, then slides out. Decorative only. */
function LiveFeed() {
  return (
    <div aria-hidden="true" className="relative max-w-md">
      <div className="eyebrow mb-3 flex items-center gap-2">
        <span className="live-dot size-2 rounded-full bg-ok" /> Live alerts
      </div>
      <div className="relative h-28">
        {FEED.map((f) => (
          <div key={f.platform} className="feed-card" style={{ animationDelay: f.delay }}>
            <div className="glass rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3">
                <span
                  className="size-10 shrink-0 rounded-full"
                  style={{ background: `linear-gradient(135deg, ${PLATFORM_META[f.platform]?.color}, color-mix(in oklab, ${PLATFORM_META[f.platform]?.color} 45%, #000))` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{f.creator}</p>
                  <p className="truncate text-sm text-text-muted">{f.text}</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-semibold">
                  {f.live && <span className="live-dot size-1.5 rounded-full bg-danger" />}
                  {f.tag}
                </span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-raised">
                <div className="feed-bar h-full rounded-full" style={{ background: PLATFORM_META[f.platform]?.color, animationDelay: f.delay }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await getSession();
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (session.user) redirect(next);
  const err = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const site = getEnv().SITE_URL;

  return (
    <main id="main" className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      {/* the scene: grid + slowly drifting colour */}
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-20 opacity-60" />
      <div aria-hidden="true" className="orb orb-a -left-24 top-1/4 -z-10 size-120 bg-signal/25" />
      <div aria-hidden="true" className="orb orb-b -right-20 top-0 -z-10 size-104 bg-twitch/20" />
      <div aria-hidden="true" className="orb orb-a bottom-0 left-1/3 -z-10 size-96 bg-tiktok/10" />

      <header className="rise px-5 pt-7 sm:px-10 lg:px-16">
        <Logo size={36} />
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-5 py-10 sm:px-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,27rem)] lg:gap-16 lg:px-16">
        {/* Headline side */}
        <section>
          <p className="eyebrow eyebrow-bar rise" style={{ animationDelay: "60ms" }}>
            Discord alerts for creators
          </p>
          <h1 className="rise mt-5 max-w-2xl text-[clamp(2.4rem,5.4vw,4.1rem)] font-extrabold leading-[1.04] tracking-[-0.035em]" style={{ animationDelay: "120ms" }}>
            Alerts for <span className="text-shimmer whitespace-nowrap">every creator</span> your community follows.
          </h1>
          <p className="rise mt-5 max-w-lg text-lg text-text-muted" style={{ animationDelay: "200ms" }}>
            Pick the channel, choose who gets pinged and write your own message. Everything is set up here in a minute, no commands needed.
          </p>

          <ul className="rise mt-7 flex flex-wrap gap-2.5" style={{ animationDelay: "280ms" }} aria-label="Supported platforms">
            {PLATFORMS.map((p) => (
              <li key={p} className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-sm font-semibold backdrop-blur-md">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: PLATFORM_META[p]?.color }} />
                {PLATFORM_META[p]?.name}
              </li>
            ))}
          </ul>

          <div className="rise mt-10 hidden lg:block [@media(min-height:860px)]:block" style={{ animationDelay: "360ms" }}>
            <div className="hidden lg:block">
              <LiveFeed />
            </div>
          </div>
        </section>

        {/* Frosted login card */}
        <section className="rise w-full max-w-md justify-self-center lg:justify-self-end" style={{ animationDelay: "160ms" }}>
          <div className="glow-border relative overflow-hidden rounded-[28px] border border-border bg-surface/55 p-7 shadow-popover backdrop-blur-2xl sm:p-9">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-br from-signal/12 via-transparent to-twitch/10" />

            <div className="relative">
              <h2 className="text-3xl font-extrabold tracking-[-0.03em]">Log in</h2>
              <p className="mt-1.5 text-text-muted">Continue with Discord to manage DiscoNotify for the servers you run.</p>

              {err && ERRORS[err] && (
                <p role="alert" className="mt-5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
                  {ERRORS[err]}
                </p>
              )}

              <a href={`/api/auth/login?next=${encodeURIComponent(next)}`} className={cn(linkButtonClass("discord", "lg"), "group mt-6 w-full")}>
                Continue with Discord
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </a>

              <div className="mt-7 flex items-center gap-3 text-xs text-text-subtle">
                <span className="h-px flex-1 bg-border" />
                Included
                <span className="h-px flex-1 bg-border" />
              </div>

              <ul className="mt-4 grid grid-cols-3 gap-3">
                {INCLUDED.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface/50 px-2 py-3.5 text-center">
                    <Icon className="size-5 text-primary-text" aria-hidden="true" />
                    <span className="text-xs font-medium text-text-muted">{label}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-center text-sm text-text-muted">
                New to DiscoNotify?{" "}
                <a className="font-semibold text-text underline underline-offset-2" href={inviteUrl()} target="_blank" rel="noopener noreferrer">
                  Add it to a server
                </a>
              </p>
              <p className="mt-3 text-center text-xs text-text-subtle">
                We read your username, avatar and server list, nothing else. By continuing you agree to the{" "}
                <a className="underline underline-offset-2 hover:text-text" href={`${site}/terms`} target="_blank" rel="noopener noreferrer">
                  Terms
                </a>{" "}
                and{" "}
                <a className="underline underline-offset-2 hover:text-text" href={`${site}/privacy`} target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
