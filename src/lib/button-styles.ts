import { cva, type VariantProps } from "class-variance-authority";

// Plain module (no "use client") so server components can call linkButtonClass().
// Every button is the same height (40px, 44px on touch screens) so rows of actions line up.
export const buttonVariants = cva(
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 max-sm:h-11",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "border border-border bg-surface text-text hover:bg-surface-raised",
        ghost: "text-text-muted hover:bg-surface-raised hover:text-text",
        danger: "border border-danger/40 bg-surface text-danger hover:bg-danger/10",
      },
      // `sm` keeps the same height; it only tightens the padding.
      size: { md: "", sm: "px-3.5", icon: "w-10 px-0 max-sm:w-11" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export const linkButtonClass = (variant: VariantProps<typeof buttonVariants>["variant"] = "secondary", size: VariantProps<typeof buttonVariants>["size"] = "md") =>
  buttonVariants({ variant, size });
