import { cn } from "@/lib/cn";

/** Plan card as on the website: eyebrow label, gradient price, ribbon, gradient border when highlighted, green-dot checklist. */
export function PlanCard({
  label,
  price,
  priceNote,
  per,
  features,
  badge,
  highlight = false,
  children,
}: {
  label: string;
  price: string;
  priceNote: string;
  per: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={`${label} plan`}
      className={cn("relative flex flex-col rounded-[18px] p-7 shadow-popover", highlight ? "plan-highlight" : "border border-border bg-surface shadow-card")}
    >
      {badge && (
        <span className="absolute -top-3 right-6 rounded-full bg-(image:--grad-pill) px-3 py-1 text-xs font-bold text-white">{badge}</span>
      )}
      <p className="eyebrow">{label}</p>
      <p className="mt-4 flex items-end gap-2">
        <span className={cn("flex items-start", highlight ? "text-signal-gradient" : "text-text")}>
          <span className="mt-2 text-2xl font-extrabold">$</span>
          <span className="text-[4rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{price}</span>
        </span>
        <span className="pb-1.5 text-text-muted">{priceNote}</span>
      </p>
      <p className="mt-2 text-sm text-text-subtle">{per}</p>
      <ul className="mt-6 flex-1 space-y-3.5 border-t border-border pt-6 text-[0.95rem] text-text-muted">
        {features.map((t) => (
          <li key={t} className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-1 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-ok/15">
              <span className="size-2 rounded-full bg-ok" />
            </span>
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-7">{children}</div>
    </section>
  );
}
