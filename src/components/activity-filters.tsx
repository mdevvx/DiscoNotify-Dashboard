"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";

export interface FilterValues {
  platform: string;
  account: string;
  type: string;
  from: string;
  to: string;
}

type Option = { value: string; label: string };

/** Filters update the URL with client-side navigation, so the page never reloads. */
export function ActivityFilters({ initial, platforms, accounts, types }: { initial: FilterValues; platforms: Option[]; accounts: Option[]; types: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [v, setV] = useState(initial);
  const set = (k: keyof FilterValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const filtered = Object.values(initial).some(Boolean);

  function apply(values: FilterValues) {
    const q = new URLSearchParams();
    for (const [k, val] of Object.entries(values)) if (val) q.set(k, val);
    const qs = q.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply(v);
      }}
      className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
      aria-label="Filter alerts"
    >
      <Select value={v.platform} onChange={set("platform")} aria-label="Platform">
        <option value="">All platforms</option>
        {platforms.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      <Select value={v.account} onChange={set("account")} aria-label="Account">
        <option value="">All accounts</option>
        {accounts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      <Select value={v.type} onChange={set("type")} aria-label="Alert type">
        <option value="">All types</option>
        {types.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      <Input type="date" value={v.from} onChange={set("from")} aria-label="From date" />
      <Input type="date" value={v.to} onChange={set("to")} aria-label="To date" />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="flex-1" loading={pending}>Filter</Button>
        {filtered && (
          <Button
            variant="ghost"
            onClick={() => {
              const empty = { platform: "", account: "", type: "", from: "", to: "" };
              setV(empty);
              apply(empty);
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}
