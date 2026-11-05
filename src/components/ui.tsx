"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, CheckCircle2, Info, Inbox, Loader2, X, XCircle } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/lib/button-styles";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { PLATFORM_META } from "@/lib/messages";

// ---------- Button ----------
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

// ---------- Layout bits ----------
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-surface shadow-card", className)} {...props} />;
}

export function PageHeader({ title, description, action, icon }: { title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span aria-hidden="true" className="mt-0.5 flex size-10.5 shrink-0 items-center justify-center rounded-[11px] bg-(image:--grad-signal) text-white [&_svg]:size-5.25">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-text-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span aria-hidden="true" className="flex size-10.5 items-center justify-center rounded-[11px] bg-(image:--grad-signal) text-white">
        <Inbox className="size-5.25" />
      </span>
      <p className="text-base font-semibold">{title}</p>
      {children && <p className="max-w-md text-text-muted">{children}</p>}
      {action}
    </div>
  );
}

const toneClasses = {
  neutral: "border border-border bg-surface text-text-muted",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
  brand: "bg-(image:--grad-pill) text-white",
} as const;

/** Status chips always carry text (and usually an icon), never colour alone. */
export function Badge({ tone = "neutral", icon, children, className }: { tone?: keyof typeof toneClasses; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", toneClasses[tone], className)}>
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const meta = PLATFORM_META[platform];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: meta?.color ?? "var(--text-muted)" }} />
      {meta?.name ?? platform}
    </span>
  );
}

export function GuildIcon({ name, icon, size = 40, round = false, className }: { name: string; icon: string | null; size?: number; round?: boolean; className?: string }) {
  const shape = round ? "rounded-full" : "rounded-lg";
  if (icon) {
    return <Image src={icon} alt="" width={size} height={size} unoptimized className={cn("shrink-0 bg-surface-raised object-cover", shape, className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center bg-linear-to-br from-surface-raised to-surface font-semibold text-text-muted", shape, className)}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34) }}
    >
      {(name || "?").trim().slice(0, 2).toUpperCase()}
    </span>
  );
}

// ---------- Form controls ----------
export const fieldClass =
  "h-11 w-full rounded-md border border-border bg-background px-3.5 font-mono text-[0.95rem] text-text transition-colors placeholder:text-text-subtle hover:border-text-subtle/60 focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-signal aria-invalid:border-signal disabled:opacity-60 max-sm:h-12";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(fieldClass, className)} {...p} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cn(fieldClass, "field-select pr-9", className)} {...p} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(fieldClass, "h-auto min-h-24 py-2", className)} {...p} />;
});

export function Field({ label, hint, error, htmlFor, children }: { label: string; hint?: string; error?: string | null; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[0.92rem] font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[0.82rem] text-text-subtle">{hint}</p>}
      {error && (
        <p role="alert" className="text-[0.82rem] text-primary-text">
          {error}
        </p>
      )}
    </div>
  );
}

export const Switch = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(function Switch({ className, ...p }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-no transition-colors duration-150 data-[state=checked]:bg-ok disabled:opacity-50 max-sm:h-7 max-sm:w-12",
        className,
      )}
      {...p}
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-1 rounded-full bg-white transition-transform duration-150 data-[state=checked]:translate-x-6 max-sm:size-5" />
    </SwitchPrimitive.Root>
  );
});

// ---------- Dialog ----------
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 fade-in" />
        <DialogPrimitive.Content className="fade-in fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-surface shadow-popover">
          <div className="flex items-start justify-between gap-4 border-b border-border p-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className={cn("mt-0.5 text-sm text-text-muted", !description && "sr-only")}>{description ?? title}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="overflow-y-auto p-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const alertTone = {
  info: { color: "var(--info)", Icon: Info },
  success: { color: "var(--ok)", Icon: CheckCircle2 },
  warning: { color: "var(--warning)", Icon: AlertTriangle },
  danger: { color: "var(--danger)", Icon: XCircle },
} as const;

/** Same look as the website's alerts. Colour is never the only signal: icon and text always accompany it. */
export function Banner({ tone = "info", children, action }: { tone?: "info" | "warning" | "danger" | "success"; children: React.ReactNode; action?: React.ReactNode }) {
  const { color, Icon } = alertTone[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3.5 text-[0.9rem]"
      style={{
        background: `color-mix(in srgb, ${color} 9%, var(--surface))`,
        borderColor: `color-mix(in srgb, ${color} 45%, var(--border))`,
      }}
    >
      <span aria-hidden="true" className="flex size-6.5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 text-text-muted">{children}</div>
      {action}
    </div>
  );
}

/** Small mono label above titles and in table heads. `bar` adds the red gradient bar. */
export function Eyebrow({ children, bar = false, className }: { children: React.ReactNode; bar?: boolean; className?: string }) {
  return <p className={cn("eyebrow", bar && "eyebrow-bar", className)}>{children}</p>;
}
