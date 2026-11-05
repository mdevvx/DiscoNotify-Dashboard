import "server-only";
import { getGuildPlans, type GuildPlanRow } from "./db";
import { guildIconUrl } from "./discord";
import type { SessionGuild } from "./session";

export interface GuildView {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  botPresent: boolean;
  plan: GuildPlanRow | null;
}

export type PlanLabel = "Free" | "Premium" | "Whitelisted";

export function planLabel(plan: GuildPlanRow | null): PlanLabel {
  if (plan?.plan === "whitelisted") return "Whitelisted";
  return plan?.unlimited ? "Premium" : "Free";
}

/** Names and icons come from Discord; fall back to the database name, then a placeholder. */
export async function buildGuildViews(list: SessionGuild[]): Promise<GuildView[]> {
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
