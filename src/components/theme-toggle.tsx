"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const opts = [
    { v: "light", icon: Sun, label: "Light" },
    { v: "dark", icon: Moon, label: "Dark" },
    { v: "system", icon: Monitor, label: "System" },
  ] as const;
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-lg border border-border bg-surface p-0.5">
      {opts.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={mounted && theme === v}
          aria-label={label}
          onClick={() => setTheme(v)}
          className={cn("flex h-7 flex-1 items-center justify-center rounded-md text-text-muted transition-colors max-sm:h-9", mounted && theme === v && "bg-surface-raised text-text")}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
