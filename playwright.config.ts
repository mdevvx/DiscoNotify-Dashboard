import { defineConfig } from "@playwright/test";

const PORT = 3457;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}` },
  // Runs against a production build. Set the .env.example variables (a dummy database is fine for public pages)
  // plus DN_SKIP_PREFLIGHT=1 when no real database is reachable.
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
});
