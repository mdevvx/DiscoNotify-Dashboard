import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { BotSwitch } from "@/components/bot-switch";
import { PermissionChecks } from "@/components/permission-checks";
import { CopyButton } from "@/components/copy-button";
import { RemoveAll } from "@/components/remove-all";
import { Card, PageHeader } from "@/components/ui";
import { listAccounts } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireGuildPage } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const ctx = await requireGuildPage(guildId);
  const accounts = await listAccounts(guildId);
  return (
    <>
      <PageHeader title="Settings" icon={<Settings />} description="Server-wide options for DiscoNotify." />
      <div className="grid gap-4">
        <BotSwitch guildId={guildId} initial={ctx.guildRow?.enabled ?? true} />

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Server details</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-text-muted">Name</dt><dd className="truncate font-medium">{ctx.guildRow?.name ?? "—"}</dd></div>
            <div>
              <dt className="text-text-muted">Server ID</dt>
              <dd className="flex items-center gap-1 font-mono">{guildId}<CopyButton value={guildId} label="Copy server ID" /></dd>
            </div>
            <div>
              <dt className="text-text-muted">Owner ID</dt>
              <dd className="flex items-center gap-1 font-mono">{ctx.guildRow?.owner_id ?? "—"}{ctx.guildRow?.owner_id && <CopyButton value={ctx.guildRow.owner_id} label="Copy owner ID" />}</dd>
            </div>
            <div><dt className="text-text-muted">Bot added</dt><dd>{formatDate(ctx.guildRow?.created_at)}</dd></div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Bot permissions</h2>
          <p className="mb-3 text-sm text-text-muted">
            Alerts need these permissions in the alert channel. Fix them in Discord under Server Settings → Roles, or the channel’s permissions.
          </p>
          <PermissionChecks guildId={guildId} />
        </Card>

        <Card className="border-danger/40 p-5">
          <h2 className="font-semibold text-danger">Danger zone</h2>
          <p className="mb-3 mt-1 text-sm text-text-muted">Removing all accounts deletes their alert settings and history. {accounts.length} account{accounts.length === 1 ? "" : "s"} right now.</p>
          <RemoveAll guildId={guildId} count={accounts.length} />
        </Card>
      </div>
    </>
  );
}
