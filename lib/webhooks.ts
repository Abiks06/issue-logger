import { createHmac } from "crypto";
import { isIP } from "net";
import type { Flavor, WebhookEvent } from "@/lib/webhook-events";

export { WEBHOOK_EVENTS, flavorOf, type Flavor, type WebhookEvent } from "@/lib/webhook-events";

// Pure helpers for outgoing webhooks: events, signing, chat formatting,
// retry timing and URL safety. Delivery I/O lives in lib/outbox.ts.

export type WebhookPayload = {
  event: WebhookEvent | "webhook.test";
  occurredAt: string;
  project: { key: string; name: string };
  issue?: { key: string; number: number; title: string; status: string; priority: string; url: string };
  actor: string | null;
  data?: Record<string, unknown>;
};

export const MAX_ATTEMPTS = 6;

/** Delay before retry n (1-based): 30s, 2m, 8m, 32m, ~2h. */
export function backoffMs(attempt: number) {
  return Math.min(30_000 * 4 ** (attempt - 1), 3 * 3_600_000);
}

/**
 * Signature over "<timestamp>.<body>", so receivers can reject replays by
 * checking the timestamp header is recent before comparing signatures.
 */
export function signPayload(secret: string, timestamp: number, body: string) {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

/** One-line human summary of an event, for chat tools. */
export function summarize(p: WebhookPayload) {
  const ref = p.issue ? `${p.issue.key} ${p.issue.title}` : p.project.name;
  const who = p.actor ?? "Issue Logger";
  switch (p.event) {
    case "issue.created":
      return `${who} created ${ref}`;
    case "issue.status_changed":
      return `${who} moved ${ref} to ${String(p.data?.to ?? p.issue?.status)}`;
    case "comment.created":
      return `${who} commented on ${ref}`;
    case "issue.regressed":
      return `${ref} happened again after it was resolved`;
    case "sla.breached":
      return `SLA breached on ${ref}`;
    default:
      return `Test event from ${p.project.name}: your webhook is working`;
  }
}

/** Request body for the endpoint's flavour. */
export function bodyFor(flavor: Flavor, p: WebhookPayload) {
  const line = summarize(p);
  if (flavor === "slack") {
    const text = p.issue ? `${line}\n<${p.issue.url}|Open ${p.issue.key}>` : line;
    return JSON.stringify({ text });
  }
  if (flavor === "discord") {
    return JSON.stringify({ content: p.issue ? `${line}\n${p.issue.url}` : line, allowed_mentions: { parse: [] } });
  }
  return JSON.stringify(p);
}

/** True for loopback, private, link-local, CGNAT, multicast and reserved addresses. */
export function isPrivateAddress(address: string) {
  const v = isIP(address);
  if (v === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (v === 6) {
    const x = address.toLowerCase();
    if (x === "::1" || x === "::") return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x);
    if (mapped) return isPrivateAddress(mapped[1]);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(x);
  }
  return true; // not an IP at all: refuse rather than guess
}

/**
 * Static checks on a webhook URL (DNS is checked again at delivery time).
 * Production requires https and a public host.
 */
export function checkWebhookUrl(raw: string, { allowLocal = false } = {}): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return "Enter a full URL, starting with https://";
  }
  if (url.username || url.password) return "URLs with embedded credentials aren't allowed";
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (allowLocal && local) return url.protocol === "http:" || url.protocol === "https:" ? null : "Use http or https";
  if (url.protocol !== "https:") return "Webhook URLs must use https";
  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) {
    return "Webhook URLs must point to a public host";
  }
  const bare = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(bare) && isPrivateAddress(bare)) return "Webhook URLs must point to a public host";
  return null;
}
