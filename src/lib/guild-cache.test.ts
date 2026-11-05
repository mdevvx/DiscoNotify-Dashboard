import { describe, expect, it } from "vitest";
import { rememberGuilds } from "./guild-cache";
import type { SessionData, SessionGuild } from "./session";

const guild = (i: number, o = false): SessionGuild => ({ id: String(BigInt("1466009969806545000") + BigInt(i)), n: "x", i: null, o, p: "1071698660929" });

describe("rememberGuilds", () => {
  it("keeps every server for a normal list and never exceeds the cookie budget", () => {
    const small: SessionData = {};
    rememberGuilds(small as never, Array.from({ length: 30 }, (_, i) => guild(i)));
    expect(small.g).toHaveLength(30);

    const big: SessionData = {};
    rememberGuilds(big as never, Array.from({ length: 200 }, (_, i) => guild(i, i === 150)));
    expect(JSON.stringify(big.g).length).toBeLessThanOrEqual(2200);
    expect(big.g![0]![0]).toBe(guild(150).id); // owned servers first
  });
});
