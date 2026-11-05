import { getEnv } from "@/lib/env";
import { inviteUrl } from "@/lib/discord";
import { buildGuildViews, planLabel } from "@/lib/guilds-view";
import { requireGuildPage } from "@/lib/page-auth";
import { getSession } from "@/lib/session";
import { avatarUrl } from "@/lib/discord";
import { ServerShell } from "@/components/shell";
import { InviteCard } from "@/components/invite-card";

export default async function GuildLayout({ children, params }: { children: React.ReactNode; params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const ctx = await requireGuildPage(guildId);
  const session = await getSession();
  const views = await buildGuildViews(session);
  const current = views.find((v) => v.id === guildId);
  if (!current) throw new Error("Guild missing from session view");
  const env = getEnv();

  return (
    <ServerShell
      guilds={views.map((v) => ({ id: v.id, name: v.name, icon: v.icon, botPresent: v.botPresent }))}
      current={{ id: current.id, name: current.name, icon: current.icon, botPresent: current.botPresent }}
      planLabel={planLabel(current.plan)}
      user={{ name: ctx.user.global_name || ctx.user.username, avatar: avatarUrl(ctx.user.id, ctx.user.avatar) }}
      siteUrl={env.SITE_URL}
      supportEmail={env.SUPPORT_EMAIL}
    >
      {current.botPresent ? children : <InviteCard guildId={guildId} guildName={current.name} href={inviteUrl(guildId)} />}
    </ServerShell>
  );
}
