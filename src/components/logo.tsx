import { cn } from "@/lib/cn";

/**
 * The DiscoNotify mark, identical to the website's icon.svg: red #CE495A tile, white #EEF0F7 pulse line and dot.
 * Colours are fixed on purpose (brand artwork), not themed.
 */
export function Logo({ size = 28, withName = true, className }: { size?: number; withName?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="8" fill="#CE495A" />
        <path d="M6.25 16H11.25L13.75 10L17.5 22L20 16H20.9" fill="none" stroke="#EEF0F7" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="25" cy="16" r="1.9" fill="#EEF0F7" />
      </svg>
      {withName && <span className="text-[15px]">DiscoNotify</span>}
    </span>
  );
}
