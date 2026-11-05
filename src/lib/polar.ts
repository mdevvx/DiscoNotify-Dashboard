import "server-only";
import { getEnv, polarBase } from "./env";

async function polar<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${polarBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getEnv().POLAR_WEB_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`polar_${res.status}`);
  return (await res.json()) as T;
}

export async function createCheckout(guildId: string, userId: string): Promise<{ url: string }> {
  const env = getEnv();
  return polar<{ url: string }>("/v1/checkouts/", {
    method: "POST",
    body: JSON.stringify({
      products: [env.POLAR_PRODUCT_ID],
      // Keys must be exactly guild_id and user_id: the bot finds the payment by them.
      metadata: { guild_id: guildId, user_id: userId },
      allow_trial: false,
      success_url: `${env.APP_URL}/servers/${guildId}/billing/thanks?checkout_id={CHECKOUT_ID}`,
      return_url: `${env.APP_URL}/servers/${guildId}/billing`,
    }),
  });
}

export interface PolarCheckout {
  id: string;
  status: "open" | "expired" | "confirmed" | "succeeded" | "failed" | string;
  metadata?: Record<string, unknown>;
  customer_email?: string | null;
}

export const getCheckout = (id: string) => polar<PolarCheckout>(`/v1/checkouts/${encodeURIComponent(id)}`);
