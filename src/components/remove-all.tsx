"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { M } from "@/lib/messages";
import { Button, Dialog, Field, Input } from "@/components/ui";

export function RemoveAll({ guildId, count }: { guildId: string; count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const r = await api<{ removed: number }>(`/api/guild/${guildId}/remove-all`, "POST", { confirm: text });
      toast.success(`Removed ${r.removed} account${r.removed === 1 ? "" : "s"}`);
      setOpen(false);
      setText("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : M.genericError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button variant="danger" disabled={count === 0} onClick={() => setOpen(true)}>Remove all accounts</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Remove all accounts?" description="This deletes every account of this server with its alert settings and history. This can’t be undone.">
        <form onSubmit={(e) => { e.preventDefault(); void go(); }} className="space-y-4">
          <Field label="Type “remove all” to confirm" htmlFor="remove-all-confirm">
            <Input id="remove-all-confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={busy} disabled={text.trim().toLowerCase() !== "remove all"}>Remove {count} account{count === 1 ? "" : "s"}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
