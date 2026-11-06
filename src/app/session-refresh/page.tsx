import type { Metadata } from "next";
import { SessionRefresh } from "@/components/session-refresh";
import { safeNext } from "@/lib/session";

export const metadata: Metadata = { title: "Reconnecting" };

export default async function SessionRefreshPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  return <SessionRefresh next={next} />;
}
