// User-facing strings live here so they are easy to review.

export const PLATFORM_META: Record<string, { name: string; color: string; handleUrl: (u: string) => string | null }> = {
  youtube: { name: "YouTube", color: "var(--platform-youtube)", handleUrl: (u) => `https://www.youtube.com/${u.startsWith("@") ? u : `@${u}`}` },
  twitch: { name: "Twitch", color: "var(--platform-twitch)", handleUrl: (u) => `https://www.twitch.tv/${u}` },
  kick: { name: "Kick", color: "var(--platform-kick)", handleUrl: (u) => `https://kick.com/${u}` },
  instagram: { name: "Instagram", color: "var(--platform-instagram)", handleUrl: (u) => `https://www.instagram.com/${u.replace(/^@/, "")}` },
  twitter: { name: "X (Twitter)", color: "var(--platform-twitter)", handleUrl: (u) => `https://x.com/${u.replace(/^@/, "")}` },
  tiktok: { name: "TikTok", color: "var(--platform-tiktok)", handleUrl: (u) => `https://www.tiktok.com/@${u.replace(/^@/, "")}` },
};

export const EVENT_LABELS: Record<string, string> = {
  video_published: "New Video",
  short_published: "New Short",
  post_created: "New Post",
  stream_started: "Live Started",
  stream_ended: "Live Ended",
  stream_updated: "Stream Updated",
  account_updated: "Account Updated",
};

export const EVENT_OFF_BY_DEFAULT = new Set(["stream_ended", "account_updated"]);

export const PLACEHOLDERS = ["creator", "title", "description", "url", "platform", "category", "viewers", "mention"] as const;

export const SAMPLE_VALUES: Record<(typeof PLACEHOLDERS)[number], string> = {
  creator: "Nova Plays",
  title: "We finally beat the final boss!",
  description: "Join the stream for the grand finale.",
  url: "https://example.com/watch/abc123",
  platform: "YouTube",
  category: "Gaming",
  viewers: "1,284",
  mention: "@Subscribers",
};

export const DEFAULT_MESSAGE = "{mention} {creator}: {title} {url}";

export const M = {
  appName: "DiscoNotify",
  changesApply: "Changes apply within a minute.",
  pauseNote: "Pausing stops all alerts for this server; your settings are kept. Changes apply within a minute.",
  lapsed: "Your Premium time ended. One account per platform keeps working; the others are paused; nothing was deleted.",
  genericError: "Something went wrong. Please try again.",
  botOffline: "DiscoNotify didn’t answer in time. Please try again in a moment.",
  webhookTip: (channel: string) =>
    `I created a webhook in #${channel}. In Channel settings → Integrations → Webhooks you can change its name and logo, and alerts will use them.`,
  freeSlotFull: (platform: string, limit: number) =>
    `Your free slot for ${platform} is already in use (${limit} of ${limit}). Get Premium to monitor more ${platform} accounts.`,
  serverFull: "This server reached the maximum number of accounts.",
  noServers: "You don’t manage any Discord server yet. You need the Manage Server permission.",
  freeBanner: (n: number) =>
    `${n} account${n === 1 ? " is" : "s are"} paused because the free plan checks 1 account per platform. Subscribe to switch ${n === 1 ? "it" : "them"} back on.`,
  statusLabel: {
    active: "Active",
    paused: "Paused",
    pausedFree: "Paused (free plan)",
    invalid: "Not found",
    error: "Retrying",
  },
  statusHelp: {
    invalid: "This account can’t be found any more. Remove it and add it again.",
    error: "It couldn’t be checked just now. It will retry automatically.",
  },
} as const;

/** Error codes (from jobs and the API) that should show a Premium button next to the message. */
export const UPGRADE_CODES = new Set(["free_limit"]);
export const RETRY_CODES = new Set(["rate_limited", "platform_error", "platform_unavailable", "bot_offline", "bot_restarted", "timeout", "internal", "discord_error"]);

/** Never show anything but a plain message. Transient codes get a friendly generic line. */
export function friendlyError(code: string | undefined, message: string | undefined): string {
  if (code && ["bot_offline", "bot_restarted", "timeout", "internal", "discord_error"].includes(code)) {
    return code === "bot_offline" ? M.botOffline : (message && message.startsWith("Something went wrong") ? message : M.genericError);
  }
  return message || M.genericError;
}
