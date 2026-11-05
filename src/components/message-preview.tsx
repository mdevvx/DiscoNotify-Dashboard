import { renderPreview } from "@/lib/format";
import { DEFAULT_MESSAGE, PLATFORM_META, SAMPLE_VALUES } from "@/lib/messages";
import { Logo } from "@/components/logo";

const ACCENT: Record<string, string> = {
  youtube: "#FF0000",
  twitch: "#9146FF",
  kick: "#53FC18",
  instagram: "#E4405F",
  twitter: "#111111",
  tiktok: "#25F4EE",
};

/** Discord-style message with sample values. All text is rendered by React, so it is escaped. */
export function DiscordPreview({ platform, message, embed }: { platform: string; message: string | null; embed: boolean }) {
  const meta = PLATFORM_META[platform];
  const values = { ...SAMPLE_VALUES, platform: meta?.name ?? SAMPLE_VALUES.platform };
  const text = renderPreview(message?.trim() ? message : DEFAULT_MESSAGE, values);
  return (
    <div aria-label="Preview of an alert" className="rounded-lg border border-border bg-surface-raised p-3">
      <div className="flex gap-3">
        <span className="shrink-0"><Logo withName={false} size={36} /></span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm">
            <span className="font-semibold">DiscoNotify</span>
            <span className="rounded-sm bg-primary px-1 text-[10px] font-semibold uppercase text-primary-foreground">Bot</span>
            <span className="text-xs text-text-muted">Today</span>
          </p>
          <p className="mt-0.5 whitespace-pre-wrap wrap-break-word text-sm">{text}</p>
          {embed && (
            <div className="mt-2 max-w-sm overflow-hidden rounded-md border-l-4 bg-surface p-3" style={{ borderLeftColor: ACCENT[platform] ?? "var(--brand)" }}>
              <p className="text-xs text-text-muted">{values.creator} · {values.platform}</p>
              <p className="mt-1 text-sm font-semibold text-info">{values.title}</p>
              <p className="mt-1 text-xs text-text-muted">{values.description}</p>
              <div aria-hidden="true" className="mt-2 h-24 rounded-sm bg-surface-raised" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
