"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./client-api";
import type { GuildInfo } from "./bot-jobs";
import { friendlyError, M } from "./messages";

export interface InfoResponse {
  info: GuildInfo;
  canMentionEveryone: boolean;
}

export const errText = (e: unknown) => (e instanceof ApiError ? friendlyError(e.code, e.message) : M.genericError);

/** Loads `guild_info` (channels, roles, plan) through the API. `reload()` bypasses the 60 s server cache. */
export function useGuildInfo(guildId: string, enabled = true) {
  const [state, setState] = useState<{ data: InfoResponse | null; error: string | null }>({ data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const fresh = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    api<InfoResponse>(`/api/guild/${guildId}/info${fresh.current ? "?fresh=1" : ""}`)
      .then((data) => !dead && setState({ data, error: null }))
      .catch((e) => !dead && setState((s) => ({ ...s, error: errText(e) })));
    return () => {
      dead = true;
    };
  }, [guildId, enabled, nonce]);

  const reload = useCallback(() => {
    fresh.current = true;
    setState((s) => ({ ...s, error: null }));
    setNonce((n) => n + 1);
  }, []);

  return { data: state.data, error: state.error, loading: !state.data && !state.error, reload };
}
