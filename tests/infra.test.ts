import { describe, expect, it, vi } from "vitest";
import { validateEnv } from "@/lib/env";

// proxy.ts imports auth.ts (which needs a database); only isPublicApi is under test.
vi.mock("@/auth", () => ({ auth: (fn: unknown) => fn }));
const { isPublicApi } = await import("@/proxy");

const good = {
  VERCEL: "1",
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  AUTH_SECRET: "x".repeat(40),
  NEXT_PUBLIC_APP_URL: "https://issues.example.com",
  RESEND_API_KEY: "re_123",
};

describe("validateEnv", () => {
  it("accepts a complete configuration", () => {
    expect(validateEnv(good, true)).toEqual({ errors: [], warnings: [] });
  });

  it("requires a database URL and auth secret", () => {
    const { errors } = validateEnv({}, true);
    expect(errors.join("\n")).toMatch(/DATABASE_URL/);
    expect(errors.join("\n")).toMatch(/AUTH_SECRET is required/);
  });

  it("treats blank values as unset and validates formats", () => {
    const { errors } = validateEnv({ ...good, DATABASE_URL: "  ", NEXT_PUBLIC_APP_URL: "not a url", SMTP_PORT: "abc" }, true);
    expect(errors.some((e) => e.startsWith("DATABASE_URL"))).toBe(true);
    expect(errors.some((e) => e.startsWith("NEXT_PUBLIC_APP_URL"))).toBe(true);
    expect(errors.some((e) => e.startsWith("SMTP_PORT"))).toBe(true);
  });

  it("is strict about short secrets only in production", () => {
    const short = { ...good, AUTH_SECRET: "short" };
    expect(validateEnv(short, true).errors).toContain("AUTH_SECRET should be at least 32 characters");
    expect(validateEnv(short, false).errors).toEqual([]);
    expect(validateEnv(short, false).warnings).toContain("AUTH_SECRET should be at least 32 characters");
  });

  it("warns about untrusted hosts outside Vercel", () => {
    expect(validateEnv({ ...good, VERCEL: undefined }, true).warnings.join()).toMatch(/AUTH_TRUST_HOST/);
    expect(validateEnv({ ...good, VERCEL: undefined, AUTH_TRUST_HOST: "true" }, true).warnings).toEqual([]);
  });

  it("warns when production can't send email", () => {
    const noMail = { ...good, RESEND_API_KEY: undefined };
    expect(validateEnv(noMail, true).warnings.join()).toMatch(/No mail transport/);
  });
});

describe("isPublicApi", () => {
  it("allows only self-authenticating API routes", () => {
    expect(isPublicApi("/api/auth/session")).toBe(true);
    expect(isPublicApi("/api/v1/events")).toBe(true);
    expect(isPublicApi("/api/cron/sla")).toBe(true);
    expect(isPublicApi("/api/session/reset")).toBe(true);
    expect(isPublicApi("/api/health")).toBe(true);
    expect(isPublicApi("/api/projects/WEB/export")).toBe(false);
    expect(isPublicApi("/api/v1")).toBe(true);
    expect(isPublicApi("/api/v10/events")).toBe(false);
    expect(isPublicApi("/api/authz")).toBe(false);
  });
});
