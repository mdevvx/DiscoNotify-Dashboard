import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WIDTHS = [375, 768, 1440] as const;
const SCHEMES = ["light", "dark"] as const;

// Public pages (no Discord login needed). Signed-in pages need a real session + database: see README "Testing".
for (const scheme of SCHEMES) {
  for (const width of WIDTHS) {
    test.describe(`login page, ${scheme}, ${width}px`, () => {
      test.use({ colorScheme: scheme, viewport: { width, height: 800 } });

      test("renders, has no horizontal scroll, no console errors, passes axe, matches screenshot", async ({ page }) => {
        const problems: string[] = [];
        page.on("console", (m) => {
          if (["error", "warning"].includes(m.type())) problems.push(m.text());
        });
        page.on("pageerror", (e) => problems.push(e.message));

        await page.goto("/login");
        await expect(page.getByRole("heading", { name: "Manage DiscoNotify" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Log in with Discord" })).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);

        const axe = await new AxeBuilder({ page }).analyze();
        const bad = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
        expect(bad, JSON.stringify(bad.map((v) => v.id))).toEqual([]);

        await expect(page).toHaveScreenshot(`login-${scheme}-${width}.png`);
        expect(problems).toEqual([]);
      });
    });
  }
}

test("signed-out visitors are sent to login, and cross-site writes are refused", async ({ page, request }) => {
  await page.goto("/servers");
  await expect(page).toHaveURL(/\/login\?next=%2Fservers/);
  const res = await request.post("/api/billing/1466009969806545009/checkout", { headers: { Origin: "https://evil.example" } });
  expect(res.status()).toBe(403);
});

test("security headers are present", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-/);
  expect(h["strict-transport-security"]).toBeTruthy();
});
