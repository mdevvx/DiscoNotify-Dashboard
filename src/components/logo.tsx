import { cn } from "@/lib/cn";

/** DiscoNotify mark (white pulse + dot on brand red) with optional wordmark. */
export function Logo({ size = 28, withName = true, className }: { size?: number; withName?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true" className="shrink-0">
        <rect width="1024" height="1024" rx="200" fill="var(--brand)" />
        <path
          d="M200 512H360L440 322L560 704L640 512H668"
          fill="none"
          stroke="#fff"
          strokeWidth="72"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="800" cy="512" r="60" fill="#fff" />
      </svg>
      {withName && <span className="text-[15px]">DiscoNotify</span>}
    </span>
  );
}
