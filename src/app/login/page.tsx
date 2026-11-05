import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
    BellRing,
    Check,
    LogIn,
    ShieldCheck,
    Zap,
    type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { linkButtonClass } from "@/lib/button-styles";
import { getEnv } from "@/lib/env";
import { PLATFORM_META } from "@/lib/messages";
import { getSession, safeNext } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
    denied: "Discord login was cancelled. You can try again whenever you’re ready.",
    state: "That login link expired. Please try again.",
    failed: "We couldn’t log you in with Discord. Please try again.",
};

const PLATFORMS = [
    "youtube",
    "twitch",
    "kick",
    "instagram",
    "twitter",
    "tiktok",
] as const;

const POINTS: { icon: LucideIcon; text: string }[] = [
    { icon: Zap, text: "Free forever for 1 account per platform" },
    {
        icon: BellRing,
        text: "Instant alerts: videos, shorts, posts and live streams",
    },
    {
        icon: ShieldCheck,
        text: "We only read your username and the servers you manage",
    },
];

/** Decorative alert card for the hero. Hidden from assistive tech; sample content only. */
function MockAlert({
    color,
    creator,
    text,
    tag,
    className,
}: {
    color: string;
    creator: string;
    text: string;
    tag: string;
    className: string;
}) {
    return (
        <div
            className={`glass w-76 rounded-xl border border-border p-3.5 shadow-popover ${className}`}
        >
            <div className="flex items-center gap-2.5">
                <span
                    className="size-8 shrink-0 rounded-full"
                    style={{
                        background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 45%, #000))`,
                    }}
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                        {creator}
                    </p>
                    <p className="truncate text-xs text-text-muted">{text}</p>
                </div>
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-semibold">
                    {tag}
                </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                <div
                    className="h-full rounded-full"
                    style={{ width: "62%", background: color }}
                />
            </div>
        </div>
    );
}

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;
    const session = await getSession();
    const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
    if (session.user) redirect(next);
    const err = Array.isArray(sp.error) ? sp.error[0] : sp.error;
    const site = getEnv().SITE_URL;

    return (
        <main id="main" className="relative isolate min-h-dvh overflow-hidden">
            <div
                aria-hidden="true"
                className="bg-grid absolute inset-0 -z-10"
            />
            <div
                aria-hidden="true"
                className="absolute -left-40 top-1/3 -z-10 size-136 rounded-full bg-brand/15 blur-[110px]"
            />

            <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                {/* Brand / pitch */}
                <section className="rise">
                    <Logo size={40} className="text-lg" />
                    <h1 className="mt-10 max-w-xl text-[2.6rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                        Never miss a <span className="text-gradient">drop</span>
                        , a stream or a post.
                    </h1>
                    <p className="mt-5 max-w-lg text-base text-text-muted sm:text-lg">
                        Set up alerts for the creators your community follows.
                        Pick the channel, choose who gets pinged, write your own
                        message — all from here, no commands needed.
                    </p>

                    <ul
                        className="mt-7 flex flex-wrap gap-2"
                        aria-label="Supported platforms"
                    >
                        {PLATFORMS.map((p) => (
                            <li
                                key={p}
                                className="glass inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium"
                            >
                                <span
                                    aria-hidden="true"
                                    className="size-2.5 rounded-full"
                                    style={{
                                        background: PLATFORM_META[p]?.color,
                                    }}
                                />
                                {PLATFORM_META[p]?.name}
                            </li>
                        ))}
                    </ul>

                    <ul className="mt-8 grid max-w-lg gap-3 text-[15px]">
                        {POINTS.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3">
                                <span
                                    aria-hidden="true"
                                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text"
                                >
                                    <Icon className="size-4" />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>

                    {/* Decorative preview of what members see in Discord */}
                    <div
                        aria-hidden="true"
                        className="relative mt-12 hidden h-52 max-w-lg lg:block"
                    >
                        <MockAlert
                            className="float-a absolute left-0 top-0 z-10"
                            color="var(--platform-twitch)"
                            creator="Nova Plays"
                            text="is live: Final boss tonight"
                            tag="LIVE"
                        />
                        <MockAlert
                            className="float-b absolute left-24 top-18 z-20"
                            color="var(--platform-youtube)"
                            creator="Pixel Kitchen"
                            text="New video: 5-minute ramen"
                            tag="VIDEO"
                        />
                        <MockAlert
                            className="float-c absolute left-48 top-36"
                            color="var(--platform-tiktok)"
                            creator="Daily Dev"
                            text="New post: Tip #42"
                            tag="POST"
                        />
                    </div>
                </section>

                {/* Login card */}
                <section className="rise rise-2 mx-auto w-full max-w-md">
                    <div className="glass rounded-2xl border border-border p-7 shadow-popover sm:p-9">
                        <h2 className="text-2xl font-semibold tracking-tight">
                            Welcome
                        </h2>
                        <p className="mt-1.5 text-text-muted">
                            Log in with Discord to manage DiscoNotify for your
                            servers.
                        </p>

                        {err && ERRORS[err] && (
                            <p
                                role="alert"
                                className="mt-5 rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm"
                            >
                                {ERRORS[err]}
                            </p>
                        )}

                        <a
                            href={`/api/auth/login?next=${encodeURIComponent(next)}`}
                            className={`${linkButtonClass("primary")} mt-6 min-h-12! w-full text-[15px] shadow-[0_8px_24px_-8px_var(--brand)]`}
                        >
                            <LogIn className="size-5" aria-hidden="true" />{" "}
                            Continue with Discord
                        </a>

                        <ul className="mt-6 space-y-2.5 text-sm text-text-muted">
                            {[
                                "Only servers where you can manage the server appear",
                                "Your Discord password is never shared with us",
                                "Log out any time to revoke access",
                            ].map((t) => (
                                <li
                                    key={t}
                                    className="flex items-start gap-2.5"
                                >
                                    <Check
                                        className="mt-0.5 size-4 shrink-0 text-success"
                                        aria-hidden="true"
                                    />
                                    {t}
                                </li>
                            ))}
                        </ul>

                        <div className="mt-7 border-t border-border pt-5 text-xs text-text-muted">
                            By continuing you agree to the{" "}
                            <a
                                className="underline"
                                href={`${site}/terms`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Terms
                            </a>{" "}
                            and{" "}
                            <a
                                className="underline"
                                href={`${site}/privacy`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Privacy Policy
                            </a>
                            .
                        </div>
                    </div>
                    <p className="mt-5 text-center text-sm">
                        <a
                            href={site}
                            className="text-text-muted underline underline-offset-4 hover:text-text"
                        >
                            What is DiscoNotify?
                        </a>
                    </p>
                </section>
            </div>
        </main>
    );
}
