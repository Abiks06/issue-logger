import { describe, expect, it } from "vitest";
import { computeFingerprint, describeEvent, priorityForLevel, topFrame, typeForLevel } from "@/lib/ingest";
import { ingestEventSchema } from "@/lib/validation";

const stack = `TypeError: Cannot read properties of undefined (reading 'id')
    at getUser (/app/src/users.ts:42:13)
    at handler (/app/src/routes.ts:10:5)`;

describe("topFrame", () => {
  it("returns the first frame without line numbers", () => {
    expect(topFrame(stack)).toBe("at getUser (/app/src/users.ts)");
  });

  it("handles missing traces", () => {
    expect(topFrame(undefined)).toBe("");
  });
});

describe("computeFingerprint", () => {
  it("groups titles that differ only by numbers", () => {
    const a = computeFingerprint({ title: "Timeout after 3012ms", stacktrace: stack });
    const b = computeFingerprint({ title: "Timeout after 2990ms", stacktrace: stack });
    expect(a).toBe(b);
  });

  it("ignores line-number churn in the stack", () => {
    const moved = stack.replace("42:13", "57:2");
    expect(computeFingerprint({ title: "x", stacktrace: stack })).toBe(computeFingerprint({ title: "x", stacktrace: moved }));
  });

  it("separates different errors", () => {
    expect(computeFingerprint({ title: "A failed" })).not.toBe(computeFingerprint({ title: "B failed" }));
  });

  it("prefers a client fingerprint", () => {
    const a = computeFingerprint({ title: "one", fingerprint: "checkout" });
    const b = computeFingerprint({ title: "two", fingerprint: "checkout" });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

describe("level mapping", () => {
  it("maps levels to priority and type", () => {
    expect(priorityForLevel("fatal")).toBe("URGENT");
    expect(priorityForLevel("info")).toBe("LOW");
    expect(typeForLevel("fatal")).toBe("INCIDENT");
    expect(typeForLevel("error")).toBe("BUG");
  });
});

describe("describeEvent", () => {
  it("renders message, stack and metadata as Markdown", () => {
    const event = ingestEventSchema.parse({
      title: "Boom",
      message: "Checkout crashed",
      environment: "production",
      stacktrace: stack,
      metadata: { orderId: 7 },
    });
    const md = describeEvent(event);
    expect(md).toContain("Checkout crashed");
    expect(md).toContain("**Environment:** production");
    expect(md).toContain("```\nTypeError");
    expect(md).toContain('"orderId": 7');
  });
});

describe("ingestEventSchema", () => {
  it("defaults level to error and rejects empty titles", () => {
    expect(ingestEventSchema.parse({ title: "x" }).level).toBe("error");
    expect(ingestEventSchema.safeParse({ title: " " }).success).toBe(false);
  });
});
