import { cva, type VariantProps } from "class-variance-authority";

// Plain module (no "use client") so server components can call linkButtonClass().
export const buttonVariants = cva(
  "inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3.5 text-sm font-medium transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 max-sm:min-h-11",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "border border-border bg-surface text-text hover:bg-surface-raised",
        ghost: "text-text-muted hover:bg-surface-raised hover:text-text",
        danger: "border border-danger/40 bg-surface text-danger hover:bg-danger/10",
      },
      size: { md: "", sm: "min-h-8 px-2.5 text-[13px]", icon: "h-9 w-9 p-0 max-sm:h-11 max-sm:w-11" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);


export const linkButtonClass = (variant: VariantProps<typeof buttonVariants>["variant"] = "secondary", size: VariantProps<typeof buttonVariants>["size"] = "md") =>
  buttonVariants({ variant, size });

