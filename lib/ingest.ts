import { createHash } from "crypto";
import type { IngestEvent } from "@/lib/validation";
import type { IssueKind, Priority } from "@/lib/constants";

// Pure helpers for the event ingestion endpoint. Database work lives in
// app/api/v1/events/route.ts.

const LEVEL_PRIORITY: Record<IngestEvent["level"], Priority> = {
  fatal: "URGENT",
  error: "HIGH",
  warning: "MEDIUM",
  info: "LOW",
};

export function priorityForLevel(level: IngestEvent["level"]): Priority {
  return LEVEL_PRIORITY[level];
}

export function typeForLevel(level: IngestEvent["level"]): IssueKind {
  return level === "fatal" ? "INCIDENT" : "BUG";
}

/** First non-empty stack frame, with line/column numbers stripped so rebuilds don't split groups. */
export function topFrame(stacktrace: string | undefined) {
  if (!stacktrace) return "";
  const frame = stacktrace
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("at ") || l.startsWith("File ") || /\.\w+:\d+/.test(l));
  return (frame ?? "").replace(/:\d+(:\d+)?/g, "");
}

/**
 * Stable grouping key. A client-supplied fingerprint wins; otherwise the
 * title (digits normalised away, so "timeout after 3012ms" groups with
 * "timeout after 2990ms") plus the top stack frame.
 */
export function computeFingerprint(event: Pick<IngestEvent, "title" | "fingerprint" | "stacktrace">) {
  const basis = event.fingerprint
    ? `custom:${event.fingerprint}`
    : `auto:${event.title.toLowerCase().replace(/\d+/g, "#").trim()}|${topFrame(event.stacktrace)}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 64);
}

/** Markdown body for a newly ingested issue. */
export function describeEvent(event: IngestEvent) {
  const parts: string[] = [];
  if (event.message) parts.push(event.message.trim());
  const facts = [`**Level:** ${event.level}`];
  if (event.environment) facts.push(`**Environment:** ${event.environment}`);
  parts.push(facts.join(" · "));
  if (event.stacktrace) parts.push("### Stack trace\n\n```\n" + event.stacktrace.trim() + "\n```");
  if (event.metadata && Object.keys(event.metadata).length > 0) {
    parts.push("### Metadata\n\n```json\n" + JSON.stringify(event.metadata, null, 2) + "\n```");
  }
  parts.push("_Reported automatically through the ingestion API._");
  return parts.join("\n\n");
}
