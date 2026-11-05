import { describe, expect, it } from "vitest";
import { safeNext } from "./session";

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
