import { Users } from "lucide-react";
import type { Metadata } from "next";
import { AccountsView, type AccountView } from "@/components/accounts-view";
import { PageHeader } from "@/components/ui";
import { getAccountChannels, getLiveAccountIds, listAccounts, listAlertConfigs } from "@/lib/db";
import { requireGuildPage } from "@/lib/page-auth";
import { DEFAULT_FREE_PER_PLATFORM, pausedByFreePlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const ctx = await requireGuildPage(guildId);
  const unlimited = Boolean(ctx.plan?.unlimited);
  const [accounts, channels, configs] = await Promise.all([listAccounts(guildId), getAccountChannels(guildId), listAlertConfigs(guildId)]);
  const live = await getLiveAccountIds(accounts.map((a) => a.id));
  const paused = pausedByFreePlan(accounts, unlimited, DEFAULT_FREE_PER_PLATFORM);

  const views: AccountView[] = accounts.map((a) => {
    const mine = configs.filter((c) => c.account_id === a.id);
    const ch = channels.get(a.id);
    const roleIds = mine.map((c) => c.mention_role_id).filter((r): r is string => Boolean(r));
    return {
      id: a.id,
      platform: a.platform,
      username: a.username,
      enabled: a.enabled,
      status: a.status,
      lastCheckedAt: a.last_checked_at,
      channelName: ch?.name ?? null,
      channelValid: ch?.is_valid ?? true,
      alertsOn: mine.filter((c) => c.enabled).length,
      alertsTotal: mine.length,
      mention: roleIds.includes(guildId) ? "everyone" : roleIds.length ? "role" : "none",
      pausedByPlan: paused.has(a.id),
      live: live.has(a.id),
    };
  });

  return (
    <>
      <PageHeader title="Accounts" icon={<Users />} description="The creators DiscoNotify watches for this server." />
      <AccountsView guildId={guildId} accounts={views} unlimited={unlimited} pausedCount={paused.size} freePerPlatform={DEFAULT_FREE_PER_PLATFORM} />
    </>
  );
}
