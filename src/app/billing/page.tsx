import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ServerGrid } from "@/components/server-grid";
import { TopShell } from "@/components/top-shell";
import { inviteUrl } from "@/lib/discord";
import { buildGuildViews, planLabel } from "@/lib/guilds-view";
import { requireSession } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPickerPage() {
  const session = await requireSession();
  const views = await buildGuildViews(session);
  return (
    <TopShell>
      <PageHeader title="Billing" description="Pick a server to see its plan and payments." />
      <ServerGrid
        suffix="/billing"
        cta="Manage"
        servers={views.map((v) => ({ id: v.id, name: v.name, icon: v.icon, owner: v.owner, botPresent: v.botPresent, plan: planLabel(v.plan), inviteHref: inviteUrl(v.id) }))}
      />
    </TopShell>
  );
}
