"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";

/** "YYYY-MM-DD" <-> local Date without timezone shifts. */
const parse = (v: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const fmtShort = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const fmtMonth = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const fmtFull = new Intl.DateTimeFormat("en", { dateStyle: "full" });
const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(2024, 0, 7 + i)));

/** A themed date picker (replaces the browser's native calendar so it follows the light/dark theme and brand colour). */
export function DateField({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  const selected = parse(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected ?? new Date());
  const [focus, setFocus] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const today = iso(new Date());

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view]);

  useEffect(() => {
    if (!open || !focus) return;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus();
  }, [open, focus, view]);

  function move(d: Date, delta: number) {
    const next = addDays(d, delta);
    setView(new Date(next.getFullYear(), next.getMonth(), 1));
    setFocus(iso(next));
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          const base = selected ?? new Date();
          setView(new Date(base.getFullYear(), base.getMonth(), 1));
          setFocus(iso(base));
        }
      }}
    >
      <div className="relative">
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={`${label}${selected ? `: ${fmtShort.format(selected)}` : ""}`}
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 text-left text-sm transition-colors hover:border-text-muted/40 focus-visible:border-brand max-sm:h-11",
              !selected && "text-text-muted/80",
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{selected ? fmtShort.format(selected) : placeholder}</span>
          </button>
        </Popover.Trigger>
        {selected && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label}`}
            className="absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} aria-label={`${label} calendar`} className="fade-in z-50 w-72 rounded-xl border border-border bg-surface p-3 shadow-popover">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="inline-flex size-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-raised hover:text-text">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <p aria-live="polite" className="text-sm font-semibold">{fmtMonth.format(view)}</p>
            <button type="button" aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="inline-flex size-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-raised hover:text-text">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div ref={grid} role="grid" aria-label={fmtMonth.format(view)} className="grid grid-cols-7 gap-y-0.5 text-center">
            {weekdays.map((w) => (
              <span key={w} role="columnheader" className="pb-1 text-[11px] font-medium text-text-muted">{w.slice(0, 2)}</span>
            ))}
            {days.map((d) => {
              const key = iso(d);
              const inMonth = d.getMonth() === view.getMonth();
              const isSel = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  data-date={key}
                  tabIndex={key === (focus ?? value ?? today) ? 0 : -1}
                  aria-label={fmtFull.format(d)}
                  aria-selected={isSel}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" ? -7 : e.key === "ArrowDown" ? 7 : 0;
                    if (step) {
                      e.preventDefault();
                      move(d, step);
                    }
                  }}
                  className={cn(
                    "mx-auto inline-flex size-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
                    inMonth ? "text-text" : "text-text-muted/50",
                    !isSel && "hover:bg-surface-raised",
                    key === today && !isSel && "border border-brand/60",
                    isSel && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="rounded-md px-2 py-1.5 text-sm text-text-muted hover:bg-surface-raised hover:text-text">Clear</button>
            <button type="button" onClick={() => { onChange(today); setOpen(false); }} className="rounded-md px-2 py-1.5 text-sm text-primary-text hover:bg-surface-raised">Today</button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
