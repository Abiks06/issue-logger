import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { resolveEmailPrefs, wantsEmail } from "@/lib/email-prefs";
import { backoffMs, bodyFor, checkWebhookUrl, flavorOf, isPrivateAddress, signPayload, summarize, type WebhookPayload } from "@/lib/webhooks";

const payload: WebhookPayload = {
  event: "issue.status_changed",
  occurredAt: "2026-10-24T10:00:00.000Z",
  project: { key: "WEB", name: "Web App" },
  issue: { key: "WEB-12", number: 12, title: "Login fails", status: "DONE", priority: "HIGH", url: "https://x.test/projects/WEB/issues/12" },
  actor: "Ada",
  data: { from: "IN_PROGRESS", to: "DONE" },
};

describe("email preferences", () => {
  it("fills defaults and keeps explicit choices", () => {
    const prefs = resolveEmailPrefs({ ASSIGNED: false, COMMENTED: true, BOGUS: true });
    expect(prefs.ASSIGNED).toBe(false);
    expect(prefs.COMMENTED).toBe(true);
    expect(prefs.MENTIONED).toBe(true);
    expect(prefs.STATUS_CHANGED).toBe(false);
    expect("BOGUS" in prefs).toBe(false);
  });

  it("tolerates malformed storage and unknown types", () => {
    expect(resolveEmailPrefs("nope").SLA_BREACHED).toBe(true);
    expect(wantsEmail(null, "MENTIONED")).toBe(true);
    expect(wantsEmail({}, "UNKNOWN_TYPE")).toBe(false);
  });
});

describe("webhook signing and formatting", () => {
  it("signs timestamp and body with HMAC-SHA256", () => {
    const expected = createHmac("sha256", "s3cret").update("1700000000.{}").digest("hex");
    expect(signPayload("s3cret", 1700000000, "{}")).toBe(`sha256=${expected}`);
  });

  it("detects chat flavours", () => {
    expect(flavorOf("https://hooks.slack.com/services/T/B/x")).toBe("slack");
    expect(flavorOf("https://discord.com/api/webhooks/1/abc")).toBe("discord");
    expect(flavorOf("https://example.com/hook")).toBe("json");
    expect(flavorOf("not a url")).toBe("json");
  });

  it("formats chat messages and plain JSON", () => {
    expect(summarize(payload)).toBe("Ada moved WEB-12 Login fails to DONE");
    expect(JSON.parse(bodyFor("slack", payload)).text).toContain("<https://x.test/projects/WEB/issues/12|Open WEB-12>");
    expect(JSON.parse(bodyFor("discord", payload))).toMatchObject({ allowed_mentions: { parse: [] } });
    expect(JSON.parse(bodyFor("json", payload))).toEqual(payload);
  });

  it("backs off exponentially with a cap", () => {
    expect([1, 2, 3].map(backoffMs)).toEqual([30_000, 120_000, 480_000]);
    expect(backoffMs(20)).toBe(3 * 3_600_000);
  });
});

describe("webhook URL safety", () => {
  it("classifies private and public addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700::1111", "172.32.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it("requires public https URLs in production", () => {
    expect(checkWebhookUrl("https://hooks.slack.com/services/x")).toBeNull();
    expect(checkWebhookUrl("http://example.com/hook")).toMatch(/https/);
    expect(checkWebhookUrl("https://169.254.169.254/latest")).toMatch(/public host/);
    expect(checkWebhookUrl("https://localhost/hook")).toMatch(/public host/);
    expect(checkWebhookUrl("https://user:pw@example.com/")).toMatch(/credentials/);
    expect(checkWebhookUrl("nonsense")).toMatch(/full URL/);
  });

  it("allows localhost only when explicitly enabled (development)", () => {
    expect(checkWebhookUrl("http://localhost:4000/hook", { allowLocal: true })).toBeNull();
    expect(checkWebhookUrl("http://localhost:4000/hook")).toMatch(/https/);
  });
});
