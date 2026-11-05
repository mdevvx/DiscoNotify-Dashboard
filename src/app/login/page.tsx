import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing, Check, Gauge, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Logo } from "@/components/logo";
import { linkButtonClass } from "@/lib/button-styles";
import { cn } from "@/lib/cn";
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

const FEED = [
  { platform: "twitch", creator: "Nova Plays", text: "is live: Final boss tonight", tag: "LIVE", live: true, delay: "0s" },
  { platform: "youtube", creator: "Pixel Kitchen", text: "New video: 5-minute ramen", tag: "VIDEO", live: false, delay: "4s" },
  { platform: "tiktok", creator: "Daily Dev", text: "New post: Tip #42", tag: "POST", live: false, delay: "8s" },
] as const;

/** One platform pill. The row is duplicated so the marquee can loop without a visible jump. */
function PlatformPills({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 gap-3" aria-hidden={hidden || undefined} aria-label={hidden ? undefined : "Supported platforms"}>
      {PLATFORMS.map((p) => (
        <li key={p} className="flex items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-sm font-medium">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: PLATFORM_META[p]?.color }} />
          {PLATFORM_META[p]?.name}
        </li>
      ))}
    </ul>
  );
}

function PlatformMarquee({ className }: { className?: string }) {
  return (
    <div className={cn("marquee overflow-hidden", className)}>
      <div className="marquee-track">
        <PlatformPills />
        <PlatformPills hidden />
      </div>
    </div>
  );
}

/** A looping "live alert" preview: one card at a time slides in, holds, then slides out. Decorative only. */
function LiveFeed() {
  return (
    <div aria-hidden="true" className="relative">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
        <span className="live-dot size-2 rounded-full bg-success" /> Live alerts
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
    <main id="main" className="relative isolate grid min-h-dvh overflow-hidden lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* ambient background */}
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-20 opacity-60" />
      <div aria-hidden="true" className="orb orb-a -left-24 top-1/4 -z-10 size-120 bg-brand/20" />
      <div aria-hidden="true" className="orb orb-b -right-24 bottom-0 -z-10 size-104 bg-twitch/15" />

      {/* Brand side */}
      <section className="hidden flex-col justify-between gap-12 p-12 lg:flex xl:p-16">
        <div className="rise">
          <Logo size={38} className="text-lg" />
        </div>

        <div className="max-w-xl">
          <h1 className="rise text-4xl font-semibold leading-[1.12] tracking-tight xl:text-5xl" style={{ animationDelay: "80ms" }}>
            Alerts for <span className="text-shimmer">every creator</span> your community follows.
          </h1>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rise flex gap-4" style={{ animationDelay: `${200 + i * 110}ms` }}>
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary-text ring-1 ring-primary/20">
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

        <div className="rise max-w-xl space-y-6" style={{ animationDelay: "560ms" }}>
          <LiveFeed />
          <PlatformMarquee />
        </div>
      </section>

      {/* Form side */}
      <section className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo size={34} />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="rise glow-border rounded-3xl bg-surface/85 p-8 backdrop-blur-sm sm:p-10" style={{ animationDelay: "150ms" }}>
            <span aria-hidden="true" className="relative mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary-text ring-1 ring-primary/25">
              <ShieldCheck className="size-7" />
            </span>
            <h2 className="text-3xl font-semibold tracking-tight">Log in</h2>
            <p className="mt-2 text-text-muted">Continue with Discord to manage DiscoNotify for the servers you run.</p>

            {err && ERRORS[err] && (
              <p role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
                {ERRORS[err]}
              </p>
            )}

            <a href={`/api/auth/login?next=${encodeURIComponent(next)}`} className={cn(linkButtonClass("discord", "lg"), "group mt-7 w-full")}>
              Continue with Discord
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
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

          <PlatformMarquee className="rise mt-8 lg:hidden" />
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
