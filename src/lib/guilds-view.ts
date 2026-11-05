import "server-only";
import { getGuildPlans, type GuildPlanRow } from "./db";
import { guildIconUrl } from "./discord";
import type { SessionData, SessionGuild } from "./session";

export interface GuildView {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  botPresent: boolean;
  plan: GuildPlanRow | null;
}

export type PlanLabel = "Free" | "Paid" | "Whitelisted";

export function planLabel(plan: GuildPlanRow | null): PlanLabel {
  if (plan?.plan === "whitelisted") return "Whitelisted";
  return plan?.unlimited ? "Paid" : "Free";
}

/** Session names may be trimmed to fit the cookie: fall back to the database name, then a placeholder. */
export async function buildGuildViews(session: SessionData): Promise<GuildView[]> {
  const list: SessionGuild[] = session.guilds ?? [];
  const plans = await getGuildPlans(list.map((g) => g.id));
  return list
    .map<GuildView>((g) => {
      const plan = plans.get(g.id) ?? null;
      return {
        id: g.id,
        name: g.n || plan?.name || `Server ${g.id.slice(-4)}`,
        icon: guildIconUrl(g.id, g.i) ?? plan?.icon_url ?? null,
        owner: g.o,
        botPresent: Boolean(plan?.bot_present),
        plan,
      };
    })
    .sort((a, b) => Number(b.botPresent) - Number(a.botPresent) || a.name.localeCompare(b.name));
}
