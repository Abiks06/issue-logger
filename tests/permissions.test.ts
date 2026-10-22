import { describe, expect, it } from "vitest";
import { can, canChangeRole, canRemoveMember } from "@/lib/permissions";

describe("can", () => {
  it("grants capabilities by minimum role", () => {
    expect(can("VIEWER", "project:view")).toBe(true);
    expect(can("VIEWER", "issue:write")).toBe(false);
    expect(can("MEMBER", "issue:write")).toBe(true);
    expect(can("MEMBER", "issue:delete")).toBe(false);
    expect(can("ADMIN", "project:manage")).toBe(true);
    expect(can("ADMIN", "project:delete")).toBe(false);
    expect(can("OWNER", "project:delete")).toBe(true);
  });

  it("denies everything without a role", () => {
    expect(can(null, "project:view")).toBe(false);
    expect(can(undefined, "project:view")).toBe(false);
  });
});

describe("canChangeRole", () => {
  it("lets owners do anything", () => {
    expect(canChangeRole("OWNER", "ADMIN", "OWNER")).toBe(true);
    expect(canChangeRole("OWNER", "OWNER", "VIEWER")).toBe(true);
  });

  it("keeps admins below their own level", () => {
    expect(canChangeRole("ADMIN", "VIEWER", "MEMBER")).toBe(true);
    expect(canChangeRole("ADMIN", "MEMBER", "ADMIN")).toBe(false);
    expect(canChangeRole("ADMIN", "ADMIN", "MEMBER")).toBe(false);
    expect(canChangeRole("ADMIN", "OWNER", "VIEWER")).toBe(false);
  });

  it("refuses members and viewers", () => {
    expect(canChangeRole("MEMBER", "VIEWER", "VIEWER")).toBe(false);
    expect(canChangeRole("VIEWER", "VIEWER", "VIEWER")).toBe(false);
  });
});

describe("canRemoveMember", () => {
  it("only removes lower roles unless owner", () => {
    expect(canRemoveMember("ADMIN", "MEMBER")).toBe(true);
    expect(canRemoveMember("ADMIN", "ADMIN")).toBe(false);
    expect(canRemoveMember("OWNER", "OWNER")).toBe(true);
    expect(canRemoveMember("MEMBER", "VIEWER")).toBe(false);
  });
});
