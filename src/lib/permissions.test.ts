import { describe, expect, it } from "vitest";
import { canManageGuild, canMentionEveryone, mentionViolation } from "./permissions";

describe("canManageGuild", () => {
  it("accepts owner, Manage Server and Administrator", () => {
    expect(canManageGuild(true, "0")).toBe(true);
    expect(canManageGuild(false, "32")).toBe(true);
    expect(canManageGuild(false, "8")).toBe(true);
  });
  it("rejects a normal role, including huge 64-bit values without those bits", () => {
    expect(canManageGuild(false, "0")).toBe(false);
    expect(canManageGuild(false, "1071698660929")).toBe(false); // bits well above 2^32, no 0x20 / 0x8
    expect(canManageGuild(false, "garbage")).toBe(false);
  });
  it("handles bits above 2^32 correctly (BigInt)", () => {
    const manageWithHighBit = (BigInt(1) << BigInt(40) | BigInt(0x20)).toString();
    expect(canManageGuild(false, manageWithHighBit)).toBe(true);
  });
});

describe("mention rule", () => {
  const gid = "1466009969806545009";
  const none = { guildId: gid, owner: false, permissions: "32" };
  const may = { guildId: gid, owner: false, permissions: String(1 << 17) };
  it("checks bit 1<<17 or Administrator", () => {
    expect(canMentionEveryone(false, String(1 << 17))).toBe(true);
    expect(canMentionEveryone(false, "8")).toBe(true);
    expect(canMentionEveryone(false, "32")).toBe(false);
  });
  it("blocks @everyone, locked roles and @everyone text without the permission", () => {
    expect(mentionViolation({ ...none, roleId: gid })).toBeTruthy();
    expect(mentionViolation({ ...none, roleId: "20", roleMentionable: false })).toBeTruthy();
    expect(mentionViolation({ ...none, roleId: null, customMessage: "hi @here" })).toBeTruthy();
  });
  it("allows normal roles and clean messages", () => {
    expect(mentionViolation({ ...none, roleId: "20", roleMentionable: true })).toBeNull();
    expect(mentionViolation({ ...none, roleId: null, customMessage: "new video {url}" })).toBeNull();
  });
  it("allows everything with the permission", () => {
    expect(mentionViolation({ ...may, roleId: gid, customMessage: "@everyone" })).toBeNull();
  });
});
