# DiscoNotify dashboard

`dashboard.disconotify.com`: log in with Discord, pick a server, configure DiscoNotify (accounts, alert channel, pings, custom
messages, pause, billing). Next.js (App Router) + TypeScript strict + Tailwind v4 + the bot's existing Supabase project.

## Run it

```bash
cp .env.example .env.local     # fill in every value, see the table in the spec (A3)
npm install
npm run dev                    # http://localhost:3000
```

Add `{APP_URL}/api/auth/callback` as a redirect in the bot's Discord application (OAuth2).
On start the app validates the environment and runs `select … from notify_guild_plans limit 1` (proves the schema and migration
`0015`). `DN_SKIP_PREFLIGHT=1` skips only the database check (local UI work / CI, never production).

## Scripts

| | |
|---|---|
| `npm run typecheck` / `npm run lint` | `tsc --noEmit`, ESLint (`next/core-web-vitals`, `jsx-a11y`, no `dangerouslySetInnerHTML`, no ID→number conversions) |
| `npm test` | Vitest: plan rules, permissions (BigInt), mention rule, cookie sizing, redirect safety, snowflake guards |
| `npm run build && npm run test:e2e` | Playwright against the production build: login page in light/dark at 375/768/1440 px, axe, screenshots, headers, CSRF |

Set `DN_TEST_GUILD_ID` (+ real `SUPABASE_*`) to also run the database snowflake round-trip test.

## How it is put together

- `src/lib/db.ts` is the **only** module that imports Supabase. Every function takes a `guildId` already verified against the session;
  snowflakes are selected as `col::text`. Tests fail if a bare snowflake column appears in a `select`.
- `src/lib/api.ts` → `requireApiGuild()` is the one gate for every route handler: session, same-origin, rate limits, the server ID
  checked against the session's manageable list (404 otherwise), bot presence. Handlers return `{ok,data}` or `{ok:false,code,message}`.
- `src/lib/bot-jobs.ts` → `callBot()` queues a job in `notify_dashboard_jobs` and polls (~700 ms, 15 s timeout → `bot_offline`).
  Only the job's plain `message` is ever shown.
- `src/lib/plans.ts` is the pure "paused by the free plan" rule, mirroring the contract.
- `src/proxy.ts` (Next 16's middleware): login redirect, per-request CSP nonce, `x-pathname`.
- Payments: card checkout and the thanks page talk to Polar; crypto inserts a `pending` row. The bot confirms and credits.

## Known limits (read before production)

- **Session cookie is 4 KB.** Server names/icons are trimmed, then dropped, then the list is cut (owned servers kept first) for people who
  manage roughly 30+ servers. A server-side session store would remove this.
- **Rate limiting and the 60 s `guild_info` cache are in memory**, per instance. Use a shared store if you run many instances.
- Accounts page shows all six platform tabs; the add dialog only offers platforms the bot reports as `available`.
- Role pings in the accounts list show "@Role" (names come from `guild_info`, which is only fetched on the account page / add dialog).
- Dashboard is English-only; strings are mostly in `src/lib/messages.ts`.
