import { describe, expect, it } from "vitest";
import { buildSelfReport, selfMonitorTarget } from "@/lib/self-monitor";
import { ingestEventSchema } from "@/lib/validation";
import { validateEnv } from "@/lib/env";

const context = { routerKind: "App Router", routePath: "/projects/[key]/issues/[number]", routeType: "render" };

describe("buildSelfReport", () => {
  it("builds a payload the ingestion API accepts", () => {
    const err = Object.assign(new TypeError("Cannot read properties of undefined (reading 'id')\nmore detail"), { digest: "123" });
    const report = buildSelfReport(err, { path: "/projects/WEB/issues/7?token=secret", method: "GET" }, context, "production");
    expect(report).not.toBeNull();
    expect(ingestEventSchema.safeParse(report).success).toBe(true);
    expect(report!.title).toBe("TypeError: Cannot read properties of undefined (reading 'id')");
    expect(report!.metadata.path).toBe("/projects/WEB/issues/7");
    expect(JSON.stringify(report)).not.toContain("secret");
    expect(report!.metadata.digest).toBe("123");
  });

  it("groups by route, not by concrete URL", () => {
    const a = buildSelfReport(new Error("boom"), { path: "/projects/WEB/issues/1", method: "GET" }, context, "production");
    const b = buildSelfReport(new Error("boom"), { path: "/projects/API/issues/9", method: "GET" }, context, "production");
    expect(a!.fingerprint).toBe(b!.fingerprint);
  });

  it("never reports errors from the ingestion route itself", () => {
    expect(buildSelfReport(new Error("x"), { path: "/api/v1/events", method: "POST" }, context, "production")).toBeNull();
  });

  it("handles non-Error throws", () => {
    const report = buildSelfReport("plain string", { path: "/", method: "GET" }, context, "development");
    expect(report!.title).toBe("Error: plain string");
  });
});

describe("selfMonitorTarget", () => {
  it("is off without a key", () => {
    expect(selfMonitorTarget({})).toBeNull();
  });

  it("prefers SELF_MONITOR_URL, then the app URL", () => {
    expect(selfMonitorTarget({ SELF_MONITOR_API_KEY: "il_x", SELF_MONITOR_URL: "https://ops.example.com/" })!.url).toBe("https://ops.example.com/api/v1/events");
    expect(selfMonitorTarget({ SELF_MONITOR_API_KEY: "il_x", NEXT_PUBLIC_APP_URL: "https://issues.example.com" })!.url).toBe(
      "https://issues.example.com/api/v1/events",
    );
  });

  it("warns about keys that aren't API keys", () => {
    const env = { DATABASE_URL: "postgresql://u:p@localhost:5432/db", AUTH_SECRET: "x".repeat(40), SELF_MONITOR_API_KEY: "sk_wrong" };
    expect(validateEnv(env, false).warnings.join(" ")).toContain("SELF_MONITOR_API_KEY");
  });
});
