import type { Metadata } from "next";
import { ThemeToggle, TopShell } from "@/components/top-shell";
import { LogoutButton } from "@/components/session-actions";
import { Card, GuildIcon, PageHeader } from "@/components/ui";
import { avatarUrl } from "@/lib/discord";
import { getEnv } from "@/lib/env";
import { requireSession } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const s = await requireSession();
  const env = getEnv();
  const name = s.user.global_name || s.user.username;
  return (
    <TopShell>
      <PageHeader title="Account" />
      <div className="grid max-w-2xl gap-4">
        <Card className="flex items-center gap-4 p-5">
          <GuildIcon name={name} icon={avatarUrl(s.user.id, s.user.avatar)} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text-muted">Logged in as</p>
            <p className="truncate text-lg font-semibold">{name}</p>
          </div>
          <LogoutButton variant="button" />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Theme</h2>
          <div className="max-w-48"><ThemeToggle /></div>
        </Card>
        <Card className="p-5 text-sm">
          <h2 className="mb-2 font-semibold">Your data</h2>
          <p className="text-text-muted">
            We only ask Discord for your username, avatar and the list of servers you manage. Logging out revokes our access.
            To remove your data, email <a className="underline" href={`mailto:${env.SUPPORT_EMAIL}`}>{env.SUPPORT_EMAIL}</a>.
          </p>
          <p className="mt-3"><a className="underline" href={`${env.SITE_URL}/privacy`} target="_blank" rel="noopener noreferrer">Privacy Policy</a></p>
        </Card>
      </div>
    </TopShell>
  );
}
