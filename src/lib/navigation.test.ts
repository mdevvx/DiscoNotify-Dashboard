import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) && !/\.test\./.test(p) ? [p] : [];
  });
}
const files = walk(ROOT).map((f) => ({ rel: path.relative(ROOT, f).replaceAll("\\", "/"), src: readFileSync(f, "utf8") }));

describe("no full page loads inside the app", () => {
  it("only the Polar checkout may assign window.location (it leaves the site); nothing reloads or rewrites the location", () => {
    const hits = files.flatMap(({ rel, src }) => [...src.matchAll(/(?:window\.)?location\.(assign|replace|reload)\(|(?:window\.)?location\.href\s*=/g)].map((m) => `${rel}: ${m[0]}`));
    expect(hits.filter((h) => !h.startsWith("components/billing-actions.tsx: window.location.assign("))).toEqual([]);
  });

  it("internal links use next/link, never a plain <a href>", () => {
    // allowed: the skip link (#main), mailto:, https:, and the login link, which leaves for Discord
    const bad = files.flatMap(({ rel, src }) =>
      [...src.matchAll(/<a\b[^>]*\bhref=(\{`?|")(\/[^"`}]*)/g)]
        .filter((m) => !m[2]!.startsWith("/api/auth/login"))
        .map((m) => `${rel}: <a href=${m[2]}`),
    );
    expect(bad).toEqual([]);
  });

  it("forms are handled in the client (onSubmit) and never post natively", () => {
    const bad = files.flatMap(({ rel, src }) => [...src.matchAll(/<form\b[^>]*\b(action|method)=/g)].map((m) => `${rel}: <form ${m[1]}=`));
    expect(bad).toEqual([]);
  });

  it("pages never redirect through an API route", () => {
    const bad = files
      .filter(({ rel }) => !rel.startsWith("app/api/"))
      .flatMap(({ rel, src }) => [...src.matchAll(/\bredirect\(\s*[`"']\/api\//g)].map(() => `${rel}: redirect(/api/...)`));
    expect(bad).toEqual([]);
  });
});
