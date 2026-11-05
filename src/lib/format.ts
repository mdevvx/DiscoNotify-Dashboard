const dtf = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const df = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const nf = new Intl.NumberFormat("en");

export const formatDateTime = (iso: string | null | undefined) => (iso ? dtf.format(new Date(iso)) : "-");
export const formatDate = (iso: string | null | undefined) => (iso ? df.format(new Date(iso)) : "-");
export const formatNumber = (n: number) => nf.format(n);
export const formatUsd = (n: number | string | null | undefined) =>
  n === null || n === undefined ? "-" : new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(Number(n));

export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const diff = Math.round((Date.parse(iso) - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / (86400 * 30)), "month");
}

/** Renders a custom message with sample values for the live preview (output is plain text, escaped by React). */
export function renderPreview(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}
