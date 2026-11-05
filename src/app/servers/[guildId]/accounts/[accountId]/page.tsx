import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AccountSettings } from "@/components/account-settings";
import type { AccountView } from "@/components/accounts-view";
import { getAccount, getAccountChannels, getLiveAccountIds, listAccounts, listAlertConfigs } from "@/lib/db";
import { requireGuildPage } from "@/lib/page-auth";
import { DEFAULT_FREE_PER_PLATFORM, pausedByFreePlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Account" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AccountPage({ params }: { params: Promise<{ guildId: string; accountId: string }> }) {
  const { guildId, accountId } = await params;
  const ctx = await requireGuildPage(guildId);
  if (!UUID.test(accountId)) notFound();
  // Scoped by guild AND account id together.
  const account = await getAccount(guildId, accountId);
  if (!account) notFound();

  const [all, channels, configs] = await Promise.all([listAccounts(guildId), getAccountChannels(guildId), listAlertConfigs(guildId, accountId)]);
  const live = await getLiveAccountIds([accountId]);
  const paused = pausedByFreePlan(all, Boolean(ctx.plan?.unlimited), DEFAULT_FREE_PER_PLATFORM);
  const ch = channels.get(accountId);

  const view: AccountView = {
    id: account.id,
    platform: account.platform,
    username: account.username,
    enabled: account.enabled,
    status: account.status,
    lastCheckedAt: account.last_checked_at,
    channelName: ch?.name ?? null,
    channelValid: ch?.is_valid ?? true,
    alertsOn: configs.filter((c) => c.enabled).length,
    alertsTotal: configs.length,
    mention: "none",
    pausedByPlan: paused.has(account.id),
    live: live.has(account.id),
  };

  return (
    <>
      <Link href={`/servers/${guildId}/accounts`} className="mb-4 inline-flex min-h-9 items-center gap-1 text-sm text-text-muted hover:text-text">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Accounts
      </Link>
      <AccountSettings
        guildId={guildId}
        account={view}
        initialConfigs={configs.map((c) => ({
          event_type: c.event_type,
          enabled: c.enabled,
          embed_enabled: c.embed_enabled,
          mention_role_id: c.mention_role_id,
          custom_message: c.custom_message,
        }))}
        channelDiscordId={ch?.channel_id ?? null}
        channelName={ch?.name ?? null}
        channelValid={ch?.is_valid ?? true}
      />
    </>
  );
}
