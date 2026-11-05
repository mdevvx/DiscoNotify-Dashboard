import type { Metadata } from "next";
import { ServerPicker } from "@/components/server-grid";
import { RefreshServers } from "@/components/session-actions";
import { TopShell } from "@/components/top-shell";
import { inviteUrl } from "@/lib/discord";
import { buildGuildViews, planLabel } from "@/lib/guilds-view";
import { requireSession } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Pick a server" };

export default async function ServersPage() {
  const session = await requireSession();
  const views = await buildGuildViews(session.guilds);
  return (
    <TopShell>
      <ServerPicker
        title="Pick a server"
        description="Configure a server DiscoNotify is already in, or add it to a new one. Only servers you manage are listed."
        action={<RefreshServers />}
        servers={views.map((v) => ({ id: v.id, name: v.name, icon: v.icon, owner: v.owner, botPresent: v.botPresent, plan: planLabel(v.plan), inviteHref: inviteUrl(v.id) }))}
      />
    </TopShell>
  );
}
