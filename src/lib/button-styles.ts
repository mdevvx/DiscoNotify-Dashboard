import { cva, type VariantProps } from "class-variance-authority";

// Plain module (no "use client") so server components can call linkButtonClass().
// Same set as the website: primary (ink), brand (red), ghost (outlined), discord. 8px corners, weight 600.
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent font-semibold transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-btn-solid text-btn-solid-ink hover:-translate-y-px hover:opacity-90",
        brand: "bg-primary text-primary-foreground hover:-translate-y-px hover:bg-primary-hover",
        discord: "bg-discord text-white hover:-translate-y-px hover:bg-discord-hover",
        // "secondary" is the website's .btn-ghost
        secondary: "border-border bg-surface text-text hover:bg-surface-raised",
        ghost: "text-text-muted hover:bg-surface-raised hover:text-text",
        danger: "border-border bg-surface text-primary-text hover:bg-signal-soft",
      },
      // sm: header and table actions. md: default. lg: hero and page-level actions.
      size: {
        sm: "h-9.5 px-3.5 text-[0.85rem]",
        md: "h-11 px-[1.15rem] text-[0.95rem] max-sm:h-12",
        lg: "h-12 rounded-lg px-[1.35rem] text-base",
        icon: "size-9.5 px-0 text-[0.85rem]",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export const linkButtonClass = (variant: VariantProps<typeof buttonVariants>["variant"] = "secondary", size: VariantProps<typeof buttonVariants>["size"] = "md") =>
  buttonVariants({ variant, size });
