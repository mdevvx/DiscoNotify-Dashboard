"use client";

import { useEffect, useState } from "react";
import { formatDateTime, relativeTime } from "@/lib/format";

/** Relative time in the viewer's locale/timezone, exact time in the tooltip. Renders the absolute time on the server to avoid mismatches. */
export function RelativeTime({ iso, className }: { iso: string | null | undefined; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setText(relativeTime(iso));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [iso]);
  if (!iso) return <span className={className}>never</span>;
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={className} suppressHydrationWarning>
      {text ?? " "}
    </time>
  );
}
