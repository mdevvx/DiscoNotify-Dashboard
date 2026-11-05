import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isSnowflake } from "./permissions";

const ROOT = path.resolve(__dirname, "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) && !/\.test\./.test(p) ? [p] : [];
  });
}

describe("snowflakes stay strings", () => {
  it("a real-looking ID is not representable as a JS number", () => {
    const id = "1466009969806545009";
    expect(String(Number(id))).not.toBe(id); // this is exactly the bug the contract warns about
    expect(isSnowflake(id)).toBe(true);
  });

  it("every select in db.ts casts snowflake columns to text", () => {
    const src = readFileSync(path.join(ROOT, "lib/db.ts"), "utf8");
    const selects = [...src.matchAll(/(?:select\(|_COLS =\s*)"([^"]+)"/g)].map((m) => m[1]!);
    expect(selects.length).toBeGreaterThan(5);
    for (const sel of selects) {
      for (const col of sel.split(",").map((c) => c.trim())) {
        if (/^(guild_id|owner_id|mention_role_id|actor_id|requested_by)$/.test(col)) {
          throw new Error(`Bare snowflake column "${col}" in select "${sel}"`);
        }
        // channel_id is a Discord snowflake except in the account -> channel link table (a uuid)
        if (col === "channel_id" && !sel.startsWith("account_id")) throw new Error(`Bare channel_id in select "${sel}"`);
      }
    }
  });

  it("no ID is ever converted to a JS number", () => {
    const bad = /(?:Number|parseInt|parseFloat)\(\s*[\w.]*(?:guild|channel|role|owner|actor|user)_?[iI]d\b/;
    for (const file of walk(ROOT)) {
      const src = readFileSync(file, "utf8");
      expect(bad.test(src), `${path.relative(ROOT, file)} converts an ID to a number`).toBe(false);
    }
  });
});

// Real round trip: set DN_TEST_GUILD_ID to a server that exists in the database (with SUPABASE_* env set).
describe.skipIf(!process.env.DN_TEST_GUILD_ID || !process.env.SUPABASE_URL)("database round trip", () => {
  it("returns the exact server ID", async () => {
    const { getGuild } = await import("./db");
    const row = await getGuild(process.env.DN_TEST_GUILD_ID!);
    expect(row?.guild_id).toBe(process.env.DN_TEST_GUILD_ID);
  });
});
