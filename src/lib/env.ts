import "server-only";
import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const schema = z.object({
  APP_URL: z.string().url(),
  SITE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  DISCORD_CLIENT_ID: z.string().regex(/^\d{15,20}$/),
  DISCORD_CLIENT_SECRET: z.string().min(10),
  DISCORD_BOT_PERMISSIONS: z.string().regex(/^\d+$/).default("537021568"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_SCHEMA: z.string().default("disconotify"),
  POLAR_WEB_TOKEN: z.string().min(5),
  POLAR_PRODUCT_ID: z.string().min(5),
  POLAR_SANDBOX: bool,
  NOWPAYMENTS_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  NOWPAYMENTS_SANDBOX: bool,
  BILLING_PRICE_USD: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .default("1.99"),
  SUPPORT_EMAIL: z.string().email().default("support@disconotify.com"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validates once and throws a readable message listing every missing or invalid variable. */
export function getEnv(): Env {
  if (cached) return cached;
  // Hosting dashboards often keep the quotes or a trailing space/newline when a value is pasted (FOO="bar"): strip them.
  const clean: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) {
    clean[k] = typeof v === "string" ? v.trim().replace(/^(["'])(.*)\1$/s, "$2").trim() : v;
  }
  const parsed = schema.safeParse(clean);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`DiscoNotify dashboard: invalid environment\n${lines.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}

export const cryptoEnabled = () => Boolean(getEnv().NOWPAYMENTS_API_KEY);
export const polarBase = () => (getEnv().POLAR_SANDBOX ? "https://sandbox-api.polar.sh" : "https://api.polar.sh");
export const priceUsd = () => Number(getEnv().BILLING_PRICE_USD);
