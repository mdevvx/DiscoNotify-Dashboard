import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WIDTHS = [320, 375, 768, 1440] as const;

// Screenshot baselines are rendered per operating system (fonts differ), so they are compared locally. On CI they run only when
// Linux baselines have been generated and E2E_VISUAL=1 is set.
const compareScreenshots = !process.env.CI || process.env.E2E_VISUAL === "1";
const SCHEMES = ["light", "dark"] as const;

// Public pages (no Discord login needed). Signed-in pages need a real session + database: see README "Testing".
for (const scheme of SCHEMES) {
  for (const width of WIDTHS) {
    test.describe(`login page, ${scheme}, ${width}px`, () => {
      test.use({ colorScheme: scheme, reducedMotion: "reduce", viewport: { width, height: 800 } });

      test("renders, has no horizontal scroll, no console errors, passes axe, matches screenshot", async ({ page }) => {
        const problems: string[] = [];
        page.on("console", (m) => {
          if (["error", "warning"].includes(m.type())) problems.push(m.text());
        });
        page.on("pageerror", (e) => problems.push(e.message));

        await page.goto("/login");
        await expect(page.getByRole("heading", { name: "Log in", level: 2 })).toBeVisible();
        await expect(page.getByRole("link", { name: "Continue with Discord" })).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);

        // The page hides horizontal overflow, so also make sure no heading, link or button runs past the viewport edge.
        const clipped = await page.evaluate(() =>
          [...document.querySelectorAll("h1, h1 span, h2, a, button")].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5).map((el) => el.textContent?.slice(0, 30)),
        );
        expect(clipped).toEqual([]);

        const axe = await new AxeBuilder({ page }).analyze();
        const bad = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
        expect(bad, JSON.stringify(bad.map((v) => v.id))).toEqual([]);

        if (compareScreenshots) await expect(page).toHaveScreenshot(`login-${scheme}-${width}.png`);
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
