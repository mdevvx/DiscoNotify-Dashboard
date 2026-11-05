import { cn } from "@/lib/cn";

/**
 * The DiscoNotify mark (identical to the website's icon.svg): rounded square in the brand red, white pulse line and dot.
 * Wordmark: Plus Jakarta Sans 700, 1.15rem, letter-spacing -0.02em, gap 0.55rem.
 */
export function Logo({ size = 28, withName = true, className }: { size?: number; withName?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.55rem] font-bold tracking-[-0.02em]", className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="8" fill="var(--signal)" />
        <path d="M6.25 16H11.25L13.75 10L17.5 22L20 16H20.9" fill="none" stroke="#fff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="25" cy="16" r="1.9" fill="#fff" />
      </svg>
      {withName && <span className="text-[1.15rem] leading-none">DiscoNotify</span>}
    </span>
  );
}
