import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ServerGrid } from "@/components/server-grid";
import { RefreshLink, TopShell } from "@/components/top-shell";
import { inviteUrl } from "@/lib/discord";
import { buildGuildViews, planLabel } from "@/lib/guilds-view";
import { requireSession } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Your servers" };

export default async function ServersPage() {
  const session = await requireSession();
  const views = await buildGuildViews(session);
  return (
    <TopShell>
      <PageHeader title="Your servers" description="Servers where you can manage DiscoNotify." action={<RefreshLink next="/servers" />} />
      <ServerGrid
        servers={views.map((v) => ({ id: v.id, name: v.name, icon: v.icon, owner: v.owner, botPresent: v.botPresent, plan: planLabel(v.plan), inviteHref: inviteUrl(v.id) }))}
      />
    </TopShell>
  );
}
