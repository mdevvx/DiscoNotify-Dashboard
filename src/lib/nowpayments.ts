import "server-only";
import { getEnv } from "./env";

const base = () => (getEnv().NOWPAYMENTS_SANDBOX ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io");

async function np<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { "x-api-key": getEnv().NOWPAYMENTS_API_KEY ?? "", "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`nowpayments_${res.status}`);
  return (await res.json()) as T;
}

export interface CryptoPayment {
  payment_id: string | number;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  payment_status: string;
  expiration_estimate_date?: string;
}

export async function listCoins(): Promise<string[]> {
  const r = await np<{ selectedCurrencies: string[] }>("/v1/merchant/coins");
  return r.selectedCurrencies ?? [];
}

export const createCryptoPayment = (guildId: string, amountUsd: number, payCurrency: string) =>
  np<CryptoPayment>("/v1/payment", {
    method: "POST",
    body: JSON.stringify({
      price_amount: amountUsd,
      price_currency: "usd",
      pay_currency: payCurrency,
      order_id: `${guildId}-${crypto.randomUUID().slice(0, 8)}`,
    }),
  });
