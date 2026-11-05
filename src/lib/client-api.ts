"use client";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let onUnauthenticated: ((path: string) => void) | null = null;
/** Registered once by <Providers> so a lost session moves to /login with client-side navigation (no page reload). */
export function setUnauthenticatedHandler(fn: ((path: string) => void) | null) {
  onUnauthenticated = fn;
}

/** Browser-side call to this app's own route handlers. Resolves to `data` or throws ApiError. */
export async function api<T = unknown>(path: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("network", "Can’t reach DiscoNotify right now. Check your connection and try again.", 0);
  }
  let json: { ok?: boolean; data?: T; code?: string; message?: string } | null = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (res.status === 401) {
    onUnauthenticated?.(window.location.pathname);
    throw new ApiError("unauthenticated", "Please log in again.", 401);
  }
  if (!res.ok || !json?.ok) {
    throw new ApiError(json?.code ?? "internal", json?.message ?? "Something went wrong. Please try again.", res.status);
  }
  return json.data as T;
}
