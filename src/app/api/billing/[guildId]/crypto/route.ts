import { z } from "zod";
import { audit, HttpError, parseBody, requireApiGuild, respond } from "@/lib/api";
import { insertPendingCryptoPayment } from "@/lib/db";
import { cryptoEnabled, priceUsd } from "@/lib/env";
import { createCryptoPayment, listCoins } from "@/lib/nowpayments";

export async function GET(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return respond(async () => {
    await requireApiGuild(req, guildId);
    if (!cryptoEnabled()) return { coins: [] as string[] };
    try {
      return { coins: (await listCoins()).slice(0, 40) };
    } catch {
      return { coins: [] as string[] };
    }
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return respond(async () => {
    const ctx = await requireApiGuild(req, guildId, { rate: { name: "crypto", max: 6 } });
    if (!cryptoEnabled()) throw new HttpError(404, "not_found", "Crypto payments aren’t available.");
    const { months, coin } = await parseBody(
      req,
      z.object({
        months: z.union([z.literal(3), z.literal(6), z.literal(12)]),
        coin: z.string().regex(/^[a-z0-9]{2,20}$/i),
      }),
    );
    const amount = Math.round(months * priceUsd() * 100) / 100;
    let pay;
    try {
      pay = await createCryptoPayment(guildId, amount, coin.toLowerCase());
    } catch {
      throw new HttpError(502, "payment_unavailable", "We couldn’t create the crypto payment. Nothing was charged. Try another coin or try again.");
    }
    await insertPendingCryptoPayment({
      guildId,
      externalId: String(pay.payment_id),
      months,
      amountUsd: amount,
      requestedBy: ctx.userId,
      metadata: { pay_currency: pay.pay_currency, pay_amount: pay.pay_amount },
    });
    await audit(ctx, "billing.checkout_started", "server", { provider: "nowpayments", months });
    return {
      payment_id: String(pay.payment_id),
      address: pay.pay_address,
      amount: pay.pay_amount,
      currency: pay.pay_currency,
      expires_at: pay.expiration_estimate_date ?? null,
      months,
      amount_usd: amount,
    };
  });
}
