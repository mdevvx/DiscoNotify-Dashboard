import { describe, expect, it } from "vitest";
import { fitGuilds, safeNext, type SessionGuild } from "./session";

const g = (i: number): SessionGuild => ({ id: String(BigInt("1466009969806545000") + BigInt(i)), n: `Server number ${i} with a long name`, i: "a".repeat(32), o: false, p: "1071698660929" });

describe("safeNext", () => {
  it("allows only same-site relative paths", () => {
    expect(safeNext("/servers/123/billing")).toBe("/servers/123/billing");
    expect(safeNext("https://evil.com")).toBe("/servers");
    expect(safeNext("//evil.com")).toBe("/servers");
    expect(safeNext("/\\evil.com")).toBe("/servers");
    expect(safeNext("javascript:alert(1)")).toBe("/servers");
    expect(safeNext(null)).toBe("/servers");
  });
});

describe("fitGuilds", () => {
  it("keeps everything for a few servers", () => {
    const list = [g(1), g(2)];
    expect(fitGuilds(list)).toEqual(list);
  });
  it("trims names/icons for many servers so the cookie stays small, keeping every ID", () => {
    const list = Array.from({ length: 24 }, (_, i) => g(i));
    const out = fitGuilds(list);
    expect(JSON.stringify(out).length).toBeLessThanOrEqual(1900);
    expect(out.map((x) => x.id)).toEqual(list.map((x) => x.id));
  });
  it("never exceeds the budget, even for 80 servers (owned ones are kept first)", () => {
    const list = Array.from({ length: 80 }, (_, i) => ({ ...g(i), o: i === 79 }));
    const out = fitGuilds(list);
    expect(JSON.stringify(out).length).toBeLessThanOrEqual(1900);
    expect(out[0]!.o).toBe(true);
  });
});
