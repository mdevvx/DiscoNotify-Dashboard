"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import type { PlanState } from "@/lib/plans";
import { friendlyError, M } from "@/lib/messages";
import { Button } from "@/components/ui";

// The crypto dialog (and the QR library) is only downloaded when someone opens it.
const CryptoDialog = dynamic(() => import("@/components/crypto-dialog").then((m) => m.CryptoDialog), { ssr: false });

const errText = (e: unknown) => (e instanceof ApiError ? friendlyError(e.code, e.message) : M.genericError);

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
  const [crypto, setCryptoState] = useState(false);
  const [cryptoOpened, setCryptoOpened] = useState(false);
  const setCrypto = (o: boolean) => {
    if (o) setCryptoOpened(true);
    setCryptoState(o);
  };

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
      <div className={subscribe || state === "paid_crypto" ? "flex flex-col gap-2.5" : "flex flex-wrap gap-2"}>
        {subscribe && (
          <Button variant="brand" className="w-full" loading={busy === "checkout"} onClick={checkout}>
            {state === "free_lapsed" ? "Subscribe again" : `Subscribe for $${price}/month`}
          </Button>
        )}
        {subscribe && cryptoEnabled && <Button className="w-full" onClick={() => setCrypto(true)}>Pay with crypto</Button>}
        {(state === "paid_card" || state === "paid_card_past_due" || state === "paid_card_cancelling") && (
          <Button variant={state === "paid_card_past_due" ? "brand" : "secondary"} loading={busy === "portal"} onClick={portal}>
            Manage billing
          </Button>
        )}
        {state === "paid_card_cancelling" && <Button disabled title="Available when your current period ends">Resubscribe</Button>}
        {state === "paid_crypto" && cryptoEnabled && <Button variant="brand" className="w-full sm:w-auto" onClick={() => setCrypto(true)}>Add more months</Button>}
      </div>
      {state !== "whitelisted" && (
        <p className="text-xs text-text-muted">
          ${price} per server, per month. By paying you agree to the{" "}
          <a className="underline" href={links.terms} target="_blank" rel="noopener noreferrer">Terms</a>,{" "}
          <a className="underline" href={links.privacy} target="_blank" rel="noopener noreferrer">Privacy Policy</a> and{" "}
          <a className="underline" href={links.refund} target="_blank" rel="noopener noreferrer">Refund Policy</a>.
        </p>
      )}
      {cryptoEnabled && (crypto || cryptoOpened) && <CryptoDialog guildId={guildId} open={crypto} onOpenChange={setCrypto} price={Number(price)} />}
    </div>
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
      {state === "paid" && <span className="text-success">✅ Premium: unlimited accounts</span>}
      {state === "slow" && "Your payment is confirmed; activation is taking longer than usual; it will switch on automatically. Contact support if not."}
    </p>
  );
}
