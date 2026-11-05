export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { getEnv } = await import("./lib/env");
  getEnv(); // fail fast with a clear list of missing variables
  // Dev/CI only: lets the UI start without a reachable database. Never set this in production.
  if (process.env.DN_SKIP_PREFLIGHT === "1") return;
  const { preflight } = await import("./lib/db");
  await preflight(); // proves schema + migration 0015 exist
}
