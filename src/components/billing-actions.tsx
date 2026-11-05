"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import type { PlanState } from "@/lib/plans";
import { friendlyError, M } from "@/lib/messages";
import { Button, Dialog, Field, Select } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";

const errText = (e: unknown) => (e instanceof ApiError ? friendlyError(e.code, e.message) : M.genericError);

interface CryptoPay {
  payment_id: string;
  address: string;
  amount: number;
  currency: string;
  expires_at: string | null;
  months: number;
  amount_usd: number;
}

export function BillingActions({
  guildId, state, price, cryptoEnabled, links,
}: {
  guildId: string;
  state: PlanState;
  price: string;
  cryptoEnabled: boolean;
  links: { terms: string; privacy: string; refund: string };
}) {
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [crypto, setCrypto] = useState(false);

  async function checkout() {
    setBusy("checkout");
    try {
      const r = await api<{ url: string }>(`/api/billing/${guildId}/checkout`, "POST");
      window.location.assign(r.url);
    } catch (e) {
      toast.error(errText(e));
      setBusy(null);
    }
  }

  async function portal() {
    setBusy("portal");
    try {
      const r = await api<{ url: string }>(`/api/billing/${guildId}/portal`, "POST");
      window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  }

  const subscribe = state === "free_new" || state === "free_lapsed";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {subscribe && (
          <Button variant="primary" loading={busy === "checkout"} onClick={checkout}>
            {state === "free_lapsed" ? "Subscribe again" : `Subscribe — $${price}/month`}
          </Button>
        )}
        {subscribe && cryptoEnabled && <Button onClick={() => setCrypto(true)}>Pay with crypto</Button>}
        {(state === "paid_card" || state === "paid_card_past_due" || state === "paid_card_cancelling") && (
          <Button variant={state === "paid_card_past_due" ? "primary" : "secondary"} loading={busy === "portal"} onClick={portal}>
            Manage billing
          </Button>
        )}
        {state === "paid_card_cancelling" && <Button disabled title="Available when your current period ends">Resubscribe</Button>}
        {state === "paid_crypto" && cryptoEnabled && <Button variant="primary" onClick={() => setCrypto(true)}>Add more months</Button>}
      </div>
      {state !== "whitelisted" && (
        <p className="text-xs text-text-muted">
          ${price} per server, per month. By paying you agree to the{" "}
          <a className="underline" href={links.terms} target="_blank" rel="noopener noreferrer">Terms</a>,{" "}
          <a className="underline" href={links.privacy} target="_blank" rel="noopener noreferrer">Privacy Policy</a> and{" "}
          <a className="underline" href={links.refund} target="_blank" rel="noopener noreferrer">Refund Policy</a>.
        </p>
      )}
      {cryptoEnabled && <CryptoDialog guildId={guildId} open={crypto} onOpenChange={setCrypto} price={Number(price)} />}
    </div>
  );
}

function CryptoDialog({ guildId, open, onOpenChange, price }: { guildId: string; open: boolean; onOpenChange: (o: boolean) => void; price: number }) {
  const router = useRouter();
  const [months, setMonths] = useState<3 | 6 | 12>(3);
  const [coins, setCoins] = useState<string[] | null>(null);
  const [coin, setCoin] = useState("");
  const [busy, setBusy] = useState(false);
  const [pay, setPay] = useState<CryptoPay | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [left, setLeft] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open || coins) return;
    api<{ coins: string[] }>(`/api/billing/${guildId}/crypto`).then((r) => { setCoins(r.coins); setCoin(r.coins.includes("btc") ? "btc" : (r.coins[0] ?? "")); }).catch((e) => { toast.error(errText(e)); setCoins([]); });
  }, [open, coins, guildId]);

  useEffect(() => {
    if (!pay) return;
    QRCode.toDataURL(pay.address, { margin: 1, width: 160 }).then(setQr).catch(() => setQr(null));
    timer.current = setInterval(async () => {
      try {
        const r = await api<{ payment_status: string | null }>(`/api/billing/${guildId}/plan?payment=${encodeURIComponent(pay.payment_id)}`);
        if (r.payment_status && r.payment_status !== "pending") {
          setStatus(r.payment_status);
          if (timer.current) clearInterval(timer.current);
          if (r.payment_status === "paid") router.refresh();
        }
      } catch { /* keep polling */ }
      if (pay.expires_at) setLeft(Math.max(0, Math.floor((Date.parse(pay.expires_at) - Date.now()) / 1000)));
    }, 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [pay, guildId, router]);

  async function create() {
    setBusy(true);
    try {
      setPay(await api<CryptoPay>(`/api/billing/${guildId}/crypto`, "POST", { months, coin }));
      setStatus("pending");
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setPay(null); setQr(null); } }} title="Pay with crypto" description="Prepaid months. Crypto can’t renew by itself — add more months before the time runs out.">
      {!pay ? (
        <div className="space-y-4">
          <Field label="How many months?" htmlFor="crypto-months">
            <Select id="crypto-months" value={months} onChange={(e) => setMonths(Number(e.target.value) as 3 | 6 | 12)}>
              {[3, 6, 12].map((m) => <option key={m} value={m}>{m} months — ${(m * price).toFixed(2)}</option>)}
            </Select>
          </Field>
          <Field label="Coin" htmlFor="crypto-coin">
            <Select id="crypto-coin" value={coin} onChange={(e) => setCoin(e.target.value)} disabled={!coins}>
              {(coins ?? []).map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end">
            <Button variant="primary" loading={busy} disabled={!coin} onClick={create}>Create payment</Button>
          </div>
        </div>
      ) : status === "paid" ? (
        <p role="status" className="text-success">✅ Payment received. Your server now has {pay.months} more months of Premium.</p>
      ) : status === "failed" || status === "expired" ? (
        <p role="alert" className="text-danger">This payment {status === "expired" ? "expired" : "failed"}. Nothing was credited — start a new one.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <p>Send exactly <strong className="tabular-nums">{pay.amount} {pay.currency.toUpperCase()}</strong> (${pay.amount_usd.toFixed(2)}) to:</p>
          <div className="flex items-center gap-1 break-all rounded-md border border-border bg-surface-raised p-2 font-mono text-xs">
            {pay.address}<CopyButton value={pay.address} label="Copy address" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt="QR code of the payment address" width={160} height={160} className="rounded-sm bg-white" />}
          <p aria-live="polite" className="flex items-center gap-2 text-text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Waiting for the payment…
            {left !== null && <span className="tabular-nums">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} left</span>}
          </p>
        </div>
      )}
    </Dialog>
  );
}

/** After a card payment: polls the plan until the bot flips the server to Premium. */
export function PlanFlip({ guildId }: { guildId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"waiting" | "paid" | "slow">("waiting");
  useEffect(() => {
    const until = Date.now() + 120_000;
    const id = setInterval(async () => {
      try {
        const r = await api<{ unlimited: boolean }>(`/api/billing/${guildId}/plan`);
        if (r.unlimited) {
          setState("paid");
          clearInterval(id);
          router.refresh();
          return;
        }
      } catch { /* keep polling */ }
      if (Date.now() > until) { setState("slow"); clearInterval(id); }
    }, 4000);
    return () => clearInterval(id);
  }, [guildId, router]);
  return (
    <p aria-live="polite" className="mt-3 flex items-center gap-2 text-sm">
      {state === "waiting" && <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Activating your server…</>}
      {state === "paid" && <span className="text-success">✅ Premium — unlimited accounts</span>}
      {state === "slow" && "Your payment is confirmed; activation is taking longer than usual — it will switch on automatically. Contact support if not."}
    </p>
  );
}
