// Browser-safe webhook definitions, shared by the settings UI and the server.
// Everything that needs Node (signing, DNS checks) stays in lib/webhooks.ts.

export const WEBHOOK_EVENTS = [
  { event: "issue.created", label: "Issue created" },
  { event: "issue.status_changed", label: "Status changed" },
  { event: "comment.created", label: "Comment added" },
  { event: "issue.regressed", label: "Error regressed" },
  { event: "sla.breached", label: "SLA breached" },
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]["event"];

export type Flavor = "slack" | "discord" | "json";

export function flavorOf(url: string): Flavor {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname === "hooks.slack.com") return "slack";
    if ((hostname === "discord.com" || hostname === "discordapp.com") && pathname.startsWith("/api/webhooks/")) return "discord";
  } catch {
    // fall through
  }
  return "json";
}
