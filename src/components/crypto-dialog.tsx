"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { errText } from "@/lib/use-guild-info";
import { Button, Dialog, Select, Skeleton } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";

const MONTHS = [3, 6, 12] as const;
type Months = (typeof MONTHS)[number];

/** Readable names for the codes NOWPayments uses. Unknown codes fall back to the upper-cased code. */
const COIN_NAMES: Record<string, string> = {
  btc: "Bitcoin",
  eth: "Ethereum",
  ltc: "Litecoin",
  sol: "Solana",
  xmr: "Monero",
  doge: "Dogecoin",
  trx: "TRON",
  bnbbsc: "BNB (BSC)",
  usdttrc20: "USDT (TRC20)",
  usdterc20: "USDT (ERC20)",
  usdtbsc: "USDT (BSC)",
  usdtsol: "USDT (Solana)",
  usdcerc20: "USDC (ERC20)",
  usdcarc20: "USDC (Arbitrum)",
  usdcsol: "USDC (Solana)",
  usdcbsc: "USDC (BSC)",
  usdcbase: "USDC (Base)",
};
const POPULAR = ["btc", "eth", "usdttrc20", "usdterc20", "usdcerc20", "ltc", "sol", "trx"];
const coinLabel = (c: string) => COIN_NAMES[c.toLowerCase()] ?? c.toUpperCase();

interface CryptoPay {
  payment_id: string;
  address: string;
  amount: number;
  currency: string;
  expires_at: string | null;
  months: number;
  amount_usd: number;
}

export function CryptoDialog({ guildId, open, onOpenChange, price }: { guildId: string; open: boolean; onOpenChange: (o: boolean) => void; price: number }) {
  const router = useRouter();
  const [months, setMonths] = useState<Months>(3);
  const [coins, setCoins] = useState<string[] | null>(null);
  const [coin, setCoin] = useState("");
  const [busy, setBusy] = useState(false);
  const [pay, setPay] = useState<CryptoPay | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState("pending");
  const [left, setLeft] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open || coins) return;
    api<{ coins: string[] }>(`/api/billing/${guildId}/crypto`)
      .then((r) => {
        setCoins(r.coins);
        setCoin(POPULAR.find((c) => r.coins.includes(c)) ?? r.coins[0] ?? "");
      })
      .catch((e) => {
        toast.error(errText(e));
        setCoins([]);
      });
  }, [open, coins, guildId]);

  useEffect(() => {
    if (!pay) return;
    import("qrcode").then((m) => m.default.toDataURL(pay.address, { margin: 1, width: 176 })).then(setQr).catch(() => setQr(null));
    const expiry = pay.expires_at ? Date.parse(pay.expires_at) : null;
    timer.current = setInterval(async () => {
      if (expiry) setLeft(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
      try {
        const r = await api<{ payment_status: string | null }>(`/api/billing/${guildId}/plan?payment=${encodeURIComponent(pay.payment_id)}`);
        if (r.payment_status && r.payment_status !== "pending") {
          setStatus(r.payment_status);
          if (timer.current) clearInterval(timer.current);
          if (r.payment_status === "paid") router.refresh();
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [pay, guildId, router]);

  async function create() {
    setBusy(true);
    try {
      const p = await api<CryptoPay>(`/api/billing/${guildId}/crypto`, "POST", { months, coin });
      setPay(p);
      const secs = p.expires_at ? Math.max(0, Math.floor((Date.parse(p.expires_at) - Date.now()) / 1000)) : null;
      setLeft(secs);
      setTotal(secs ? Math.max(1, secs) : null);
      setStatus("pending");
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  }

  const popular = (coins ?? []).filter((c) => POPULAR.includes(c)).sort((a, b) => POPULAR.indexOf(a) - POPULAR.indexOf(b));
  const others = (coins ?? []).filter((c) => !POPULAR.includes(c)).sort();
  const totalUsd = months * price;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setPay(null);
          setQr(null);
        }
      }}
      title="Pay with crypto"
      description="Prepaid Premium. It doesn’t renew by itself, so add more months before the time runs out."
    >
      {!pay ? (
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Duration</legend>
            <div role="radiogroup" aria-label="Duration" className="grid grid-cols-3 gap-2">
              {MONTHS.map((m) => {
                const on = months === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setMonths(m)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-2xl border px-2 py-3.5 text-center transition-colors",
                      on ? "border-signal bg-signal-soft ring-[3px] ring-signal/20" : "border-border hover:bg-surface-raised",
                    )}
                  >
                    <span className="text-sm font-semibold">{m} months</span>
                    <span className="text-lg font-semibold tabular-nums">${(m * price).toFixed(2)}</span>
                    <span className="text-xs text-text-muted tabular-nums">${price.toFixed(2)}/month</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Pay with</legend>
            {!coins ? (
              <div className="grid grid-cols-2 gap-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : coins.length === 0 ? (
              <p className="rounded-lg border border-border p-3 text-sm text-text-muted">Crypto payments aren’t available right now. Please pay by card or try again later.</p>
            ) : (
              <div className="space-y-2">
                <div role="radiogroup" aria-label="Coin" className="grid grid-cols-2 gap-2">
                  {popular.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={coin === c}
                      onClick={() => setCoin(c)}
                      className={cn(
                        "flex h-11 items-center justify-between gap-2 rounded-xl border px-3.5 text-sm transition-colors max-sm:h-12",
                        coin === c ? "border-signal bg-signal-soft font-medium ring-[3px] ring-signal/20" : "border-border hover:bg-surface-raised",
                      )}
                    >
                      <span className="truncate">{coinLabel(c)}</span>
                      <span className="text-xs uppercase text-text-muted">{c.replace(/(trc20|erc20|bsc|sol|arc20|base)$/, "")}</span>
                    </button>
                  ))}
                </div>
                {others.length > 0 && (
                  <Select aria-label="More coins" value={others.includes(coin) ? coin : ""} onChange={(e) => e.target.value && setCoin(e.target.value)}>
                    <option value="">More coins…</option>
                    {others.map((c) => <option key={c} value={c}>{coinLabel(c)}</option>)}
                  </Select>
                )}
              </div>
            )}
          </fieldset>

          <div className="rounded-xl border border-border bg-surface-raised/50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-text-muted">Total</span>
              <span className="text-2xl font-semibold tabular-nums">${totalUsd.toFixed(2)}</span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
              <ShieldCheck className="size-3.5" aria-hidden="true" /> {months} months of Premium, no automatic renewal
            </p>
          </div>

          <Button variant="brand" className="w-full" loading={busy} disabled={!coin} onClick={create}>
            Create payment{coin ? ` in ${coinLabel(coin)}` : ""}
          </Button>
        </div>
      ) : status === "paid" ? (
        <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
          <p className="text-lg font-semibold">Payment received</p>
          <p className="text-sm text-text-muted">Your server now has {pay.months} more months of Premium.</p>
          <Button variant="primary" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      ) : status === "failed" || status === "expired" ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-6 text-center">
          <XCircle className="size-10 text-danger" aria-hidden="true" />
          <p className="text-lg font-semibold">Payment {status === "expired" ? "expired" : "failed"}</p>
          <p className="text-sm text-text-muted">Nothing was credited. Start a new payment when you’re ready.</p>
          <Button variant="primary" onClick={() => { setPay(null); setQr(null); }}>Start again</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-surface-raised/50 p-4 text-center">
            <p className="text-sm text-text-muted">Send exactly</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-2xl font-semibold tabular-nums">
              {pay.amount} {pay.currency.toUpperCase()}
              <CopyButton value={String(pay.amount)} label="Copy amount" />
            </p>
            <p className="text-sm text-text-muted">about ${pay.amount_usd.toFixed(2)} for {pay.months} months</p>
          </div>

          <div className="grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="mx-auto flex size-44 items-center justify-center rounded-xl border border-border bg-white p-1">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code of the payment address" width={176} height={176} className="size-full rounded-lg" />
              ) : (
                <Skeleton className="size-full" />
              )}
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-sm font-medium">To this address</p>
              <div className="flex items-start gap-1 rounded-lg border border-border bg-surface-raised/50 p-2.5 font-mono text-xs">
                <span className="min-w-0 flex-1 break-all">{pay.address}</span>
                <CopyButton value={pay.address} label="Copy address" />
              </div>
              <p className="mt-2 text-xs text-text-muted">Use the {coinLabel(pay.currency)} network only. We detect the payment automatically, usually within a few minutes.</p>
            </div>
          </div>

          <div aria-live="polite" className="space-y-2">
            <div className="flex items-center justify-between text-sm text-text-muted">
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Waiting for your payment
              </span>
              {left !== null && (
                <span className="flex items-center gap-1.5 tabular-nums">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
                </span>
              )}
            </div>
            {left !== null && total !== null && (
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                <div className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (left / total) * 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
