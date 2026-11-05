# DiscoNotify dashboard

The web app at **dashboard.disconotify.com**. A person logs in with Discord, picks a server they manage, and sets up DiscoNotify
there: which creators to watch, which channel gets the alerts, who is pinged, the message text, pausing the bot, and billing.
No slash commands are needed for setup any more.

- **Stack:** Next.js 16 (App Router, React Server Components), TypeScript (`strict`, `noUncheckedIndexedAccess`), Tailwind CSS v4,
  Radix UI primitives, zod, iron-session, TanStack Query, Supabase (server side only), Vitest, Playwright.
- **Package manager:** pnpm (Node 22 or newer).
- **Database:** the bot's existing Supabase project, schema `disconotify`. This app creates no tables and runs no migrations.

---

## 1. Quick start

```bash
pnpm install
cp .env.example .env.local      # then fill in every value (section 2)
pnpm dev                        # http://localhost:3000
```

Before it works you also need to:

1. In the bot's Discord application (Developer Portal → OAuth2) add the redirect `{APP_URL}/api/auth/callback`
   (for local work: `http://localhost:3000/api/auth/callback`).
2. Make sure migration `0015` of the bot is applied (the app checks this on start, see "Startup checks").
3. Use Polar's **sandbox** while building (`POLAR_SANDBOX=true`) and keep it equal to the bot's setting.

### Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / run it |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (`next/core-web-vitals`, `jsx-a11y`, no `dangerouslySetInnerHTML`, no Discord ID to number conversions) |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | Browser tests (Playwright) against a production build; first run `pnpm exec playwright install chromium` and `pnpm build` |
| `pnpm check` | typecheck + lint + unit tests |

---

## 2. Environment variables

All are read on the server. Nothing sensitive is `NEXT_PUBLIC_*`, and a test/CI step checks that no secret reaches the browser bundle.

| Variable | Meaning |
|---|---|
| `APP_URL` | Public URL of this app, used for redirects and the OAuth callback |
| `SITE_URL` | Marketing site; used for Terms / Privacy / Refund / Docs links |
| `SESSION_SECRET` | 32+ random characters; encrypts the session cookie |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | The bot's Discord application |
| `DISCORD_BOT_PERMISSIONS` | Invite permissions integer (default `537021568`) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SCHEMA` | The bot's Supabase project (schema `disconotify`). The service key is server only |
| `POLAR_WEB_TOKEN` | Polar org token with only `checkouts:write` + `checkouts:read` (not the bot's token) |
| `POLAR_PRODUCT_ID`, `POLAR_SANDBOX` | The paid product; sandbox flag must equal the bot's |
| `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_SANDBOX` | Optional. Leave the key empty to hide crypto payments |
| `BILLING_PRICE_USD` | Price shown in the UI (default `1.99`); must equal the Polar product price |
| `SUPPORT_EMAIL` | Shown on errors and the payment pages |
| `DN_SKIP_PREFLIGHT` | `1` skips only the database check on start. For local UI work and CI; never in production |
| `DN_TEST_GUILD_ID` | Optional. Enables the real-database snowflake round-trip test |

### Startup checks

`src/instrumentation.ts` runs when the server starts: it validates the environment (one error listing everything missing or invalid)
and runs `select … from notify_guild_plans limit 1` to prove the schema and migration `0015` exist. If either fails the server
refuses to serve, with a message saying why.

---

## 3. What the product does

**Plans.** Every server is on **Free** by default, forever: **1 monitored account per platform** (one YouTube channel, one Twitch,
one Kick, one Instagram, one X, one TikTok). **Paid** ($1.99/month per server) removes that limit, up to 25 accounts per server.
Whitelisted servers behave like Paid and never pay. There is no trial.

**Where the limit shows up**

- Overview: meters such as "YouTube 1/1".
- Accounts: tab counters ("1 / 1" on Free), and in the Add dialog a platform that reached its limit is disabled with "upgrade to add more".
- The bot is the authority: if a request slips through, it answers `free_limit` and the dashboard shows the message and an Upgrade button.
- A server that drops from Paid to Free **keeps** its accounts. The oldest account of each platform keeps working; the others show
  **"Paused — free plan"**, stay fully editable, and resume when the server pays again. Nothing is deleted.

### Pages

| Route | Purpose |
|---|---|
| `/login` | "Log in with Discord" |
| `/servers` | Server picker: icon, role, plan badge, bot present or "Add bot", search when over 8 servers, Refresh |
| `/servers/[id]` | **Overview:** bot on/off switch, plan card, stats (accounts, alerts 24 h / 7 d, live now, needing attention), attention list, recent alerts, getting-started checklist |
| `/servers/[id]/accounts` | **Accounts:** platform filter chips with counters, status chips, per-row Settings / Pause / Remove, **Add account** dialog, "paused by free plan" banner |
| `/servers/[id]/accounts/[accountId]` | One account: send test alert, alert channel, alert types (send / embed switches), who gets pinged, custom message with placeholder chips and live Discord-style preview |
| `/servers/[id]/activity` | Paged feed of sent alerts with platform / account / type / date filters |
| `/servers/[id]/settings` | Bot switch, server details, bot permission ticks, "Remove all accounts" (typed confirmation) |
| `/servers/[id]/billing` | Plan state, subscribe / manage billing / crypto, payment history, FAQ |
| `/servers/[id]/billing/thanks` | Payment result page (asks Polar, never trusts the URL) |
| `/billing` | Server picker for billing |
| `/account` | Who you are, theme, log out, privacy |

A server where the bot is not present only shows an **Add DiscoNotify** card, then continues by itself when the bot joins
(polls every 3 s for 2 minutes).

Also: dark/light/system theme with no flash, a Ctrl/Cmd+K command palette, toasts for saves, skeleton loading screens that mirror the
real layout, error pages with a reference code, mobile layout (sidebar becomes a drawer, rows become cards).

---

## 4. How it works

```
Browser ──► Next.js app ──► Supabase (service key, schema "disconotify")      reads, and a few direct writes
                      └───► notify_dashboard_jobs ──► the bot ──► Discord      add account, set channel, test alert, billing portal
                      └───► Polar / NOWPayments                                start a payment (the bot confirms it later)
```

The browser never talks to Supabase or any payment provider. It only calls this app's own pages and `/api/*` routes.

### Login and session

1. `/api/auth/login` sets a random `state` cookie and redirects to Discord (scopes **only** `identify guilds`).
2. `/api/auth/callback` checks `state`, exchanges the code, reads the user and server list, and keeps only servers the person
   **manages** (owner, Manage Server `0x20` or Administrator `0x8`, compared with BigInt).
3. The session is an encrypted `HttpOnly; Secure; SameSite=Lax` cookie (7 days) holding the user, the compact server list and the
   Discord tokens.
4. The list is re-read from Discord when older than 10 minutes (pages redirect through `/api/auth/refresh`; API calls refresh inline),
   so someone who loses Manage Server loses access within 10 minutes. The Refresh button is limited to once per 30 s.
5. Log out clears the cookie and revokes the Discord token.

### Authorization (every request)

- `src/proxy.ts` (Next 16's middleware) sends signed-out visitors to `/login?next=…` and adds the CSP nonce. It is only an early check.
- **Pages:** `requireGuildPage(guildId)` (`src/lib/page-auth.ts`). A server that is not in the session's manageable list returns **404**,
  so server IDs can't be probed.
- **API routes:** `requireApiGuild(req, guildId)` (`src/lib/api.ts`) does, in order: same-origin check for writes, rate limits,
  stale-session refresh, server ID check against the session, and "is the bot in this server".
- The server ID only ever comes from the URL and is checked against the session. Every database call is scoped with that verified
  `guild_id`; account lookups use `guild_id` **and** `account_id` together.

### Talking to the bot (jobs)

Anything that needs Discord or a platform API goes through `callBot()` (`src/lib/bot-jobs.ts`): insert a row in
`notify_dashboard_jobs`, poll it every ~700 ms, return the result, or throw a typed error. After 15 s without an answer the user sees
"DiscoNotify didn't answer in time". `guild_info` (channels, roles, plan, platforms) is cached 60 s per server.
Only the job's plain `message` is ever shown to people.

| Job | Used for |
|---|---|
| `guild_info` | Channels, roles, plan limits, platforms, bot permissions |
| `add_account` | Resolve the handle, check limit and duplicates, create the account |
| `set_channel` | Change an account's alert channel (the bot may create a webhook) |
| `send_test` | Post an example alert without pinging anyone |
| `billing_portal` | Polar customer-portal link (payer or server owner only) |

### Direct database writes (allowed by the contract)

Bot on/off (`notify_guilds.enabled`), account pause/resume and delete, the four editable alert columns (enabled, embed, mention role,
custom message), pending crypto payments, the checkout email contact, and audit rows. Everything else is read-only.
Each change writes a row to `notify_audit_logs` (action names in the contract).

### The mention rule

Choosing `@everyone`, a role that is not mentionable, or writing `@everyone` / `@here` in a custom message requires the person to have
**Mention @everyone, @here and All Roles** (bit `1 << 17`) or Administrator. The UI locks those options, and the API route enforces the
same rule again.

### Payments

- **Card (Polar):** `POST /api/billing/[id]/checkout` refuses if a card subscription is already running (no double charges), then
  creates a Polar checkout with metadata `guild_id` and `user_id`, no trial, and redirects. The thanks page asks Polar for the
  checkout, confirms it belongs to this server, shows the right message, stores the payer's email, and polls until the bot flips the
  server to Paid.
- **Crypto (NOWPayments, optional):** 3 / 6 / 12 prepaid months. The app creates the payment, inserts a `pending` row, shows the
  address, QR code and timer, and polls the row. The bot credits the time.
- The dashboard never marks anything as paid. The bot confirms payments with the providers within about a minute.

### Snowflakes (Discord IDs)

IDs are larger than JavaScript's safe integer limit. They are strings everywhere, and every database `select` casts them
(`guild_id::text`). A test fails if a bare snowflake column appears in a select, or if code converts an ID with `Number`/`parseInt`.

---

## 5. Project layout

```
src/
  proxy.ts                     login redirect + CSP nonce
  instrumentation.ts           startup env + database checks
  app/
    page.tsx, login/           entry and login
    servers/                   picker, and [guildId]/ { layout, page, accounts, activity, settings, billing }
    billing/, account/         billing picker, account page
    api/
      auth/{login,callback,logout,refresh}
      guild/[guildId]/{info,status,toggle,remove-all}
      accounts/[guildId]/…     add, pause/delete, channel, test
      alerts/[guildId]/[accountId]   alert switches, mentions, custom message
      billing/[guildId]/{checkout,portal,crypto,plan}
    error.tsx, global-error.tsx, not-found.tsx, loading.tsx   (also per segment)
  components/                  ui.tsx (Button, Card, Dialog, Switch…), shell, accounts-view, account-settings,
                               add-account-dialog, billing-actions, message-preview, …
  lib/
    db.ts                      the ONLY module that imports Supabase
    api.ts                     requireApiGuild, respond, zod body parsing, loadAccount
    bot-jobs.ts                callBot + cached guild_info
    session.ts, discord.ts     cookie session, Discord OAuth/API
    permissions.ts, plans.ts   pure rules (unit tested)
    polar.ts, nowpayments.ts   payment providers
    messages.ts, format.ts     UI strings and Intl formatting
    button-styles.ts           button classes usable from server components
e2e/                           Playwright tests
```

Design tokens (colours, radius, shadow) are CSS variables in `src/app/globals.css`; components use semantic names such as
`bg-surface`, `text-text-muted`, `bg-primary`. The logo is `public/logo.svg` / `src/app/icon.svg` / `src/components/logo.tsx`.
Brand red is `#E2364A`; buttons use `#C8283B` so white text keeps AA contrast.

---

## 6. Testing

- **Unit (`pnpm test`):** plan rules (which accounts are paused, limit checks, billing states, duplicate-checkout guard),
  permission and mention rules (including 64-bit values), cookie sizing, safe redirects, snowflake guards.
- **Browser (`pnpm test:e2e`):** login page in light and dark at 375 / 768 / 1440 px with axe accessibility scan, no console
  errors, no horizontal scroll and screenshots; signed-out redirect; cross-site POST refused; security headers.
  Screenshots are stored per OS (`*-win32.png`); regenerate with `pnpm test:e2e --update-snapshots` on a new OS.
- **Not covered automatically:** signed-in pages need a real Discord session, database and bot. Use the acceptance checklist in the
  original spec against a staging setup (Polar sandbox).

---

## 7. Security summary

Secrets only in server env; strict CSP with per-request nonce; `X-Frame-Options: DENY`; `Referrer-Policy: same-origin`; HSTS;
same-origin check on every write; per-user rate limits (60 writes/min, 10 add-account/min, 5 test-alerts/min/server, 20 logins/min/IP);
zod validation on every body; `next=` only to same-site paths; non-managers get 404; errors show a reference code, never internals;
`last_error` and portal URLs are never read, stored or shown.

---

## 8. Known limits

- **Cookie size.** Cookies hold about 4 KB. People who manage roughly 30+ servers get shorter names, then no names/icons, then a
  trimmed list (owned servers first). A server-side session store would remove this.
- **Rate limits and the `guild_info` cache are in memory,** per server instance. Use a shared store (Redis) if you run several instances.
- The Accounts list shows pings as "@Role" because role names come from `guild_info`, which is only loaded on the account page and in
  the Add dialog.
- All six platform tabs are always shown; the Add dialog only offers platforms the bot reports as available.
- English only.
- Lighthouse (≥ 95) and the full acceptance checklist still need to be run against a real environment.
