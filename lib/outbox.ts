import "server-only";
import { lookup } from "dns/promises";
import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { appUrl, mailConfigured, sendMail } from "@/lib/mail";
import { wantsEmail } from "@/lib/email-prefs";
import { issueKey } from "@/lib/constants";
import {
  MAX_ATTEMPTS, backoffMs, bodyFor, checkWebhookUrl, flavorOf, isPrivateAddress, signPayload,
  type WebhookEvent, type WebhookPayload,
} from "@/lib/webhooks";

// Transactional outbox for side effects that must not block or be lost:
// webhook deliveries (rows written in the same transaction as the change) and
// notification emails (driven by Notification.emailedAt). Flushed right after
// each mutation via `after()`, and again by the SLA sweep / cron as a backstop.

type Tx = Prisma.TransactionClient;

const allowLocalWebhooks = () => process.env.NODE_ENV !== "production";

/**
 * Queues an event for every active webhook in the project subscribed to it.
 * Call inside the transaction that makes the change. Costs one query when the
 * project has no webhooks.
 */
export async function emitWebhookEvent(
  tx: Tx,
  { projectId, event, issueId, actorId, data }: { projectId: string; event: WebhookEvent; issueId?: string; actorId?: string | null; data?: Record<string, unknown> },
) {
  const hooks = await tx.webhook.findMany({ where: { projectId, active: true, events: { has: event } }, select: { id: true } });
  if (hooks.length === 0) return;

  const [project, issue, actor] = await Promise.all([
    tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { key: true, name: true } }),
    issueId ? tx.issue.findUnique({ where: { id: issueId }, select: { number: true, title: true, status: true, priority: true } }) : null,
    actorId ? tx.user.findUnique({ where: { id: actorId }, select: { name: true } }) : null,
  ]);
  const payload: WebhookPayload = {
    event,
    occurredAt: new Date().toISOString(),
    project,
    issue: issue
      ? {
          key: issueKey(project.key, issue.number),
          number: issue.number,
          title: issue.title,
          status: issue.status,
          priority: issue.priority,
          url: appUrl(`/projects/${project.key}/issues/${issue.number}`),
        }
      : undefined,
    actor: actor?.name ?? null,
    data,
  };
  await tx.webhookDelivery.createMany({
    data: hooks.map((h) => ({ webhookId: h.id, event, payload: payload as unknown as Prisma.InputJsonValue })),
  });
}

/** Resolves the host and refuses private addresses (blocks SSRF via DNS). */
async function assertPublicHost(url: string) {
  const { hostname } = new URL(url);
  if (allowLocalWebhooks() && (hostname === "localhost" || hostname === "127.0.0.1")) return;
  const addresses = await lookup(hostname.replace(/^\[|\]$/g, ""), { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("Host resolves to a private address");
  }
}

/** Sends one webhook request; returns the HTTP status. Used by deliveries and the "Send test" button. */
export async function postWebhook(hook: { url: string; secret: string }, payload: WebhookPayload) {
  const problem = checkWebhookUrl(hook.url, { allowLocal: allowLocalWebhooks() });
  if (problem) throw new Error(problem);
  await assertPublicHost(hook.url);
  const body = bodyFor(flavorOf(hook.url), payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const res = await fetch(hook.url, {
    method: "POST",
    redirect: "manual", // a redirect could point somewhere internal
    signal: AbortSignal.timeout(8_000),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "IssueLogger-Webhooks/1.0",
      "X-IssueLogger-Event": payload.event,
      "X-IssueLogger-Timestamp": String(timestamp),
      "X-IssueLogger-Signature": signPayload(hook.secret, timestamp, body),
    },
    body,
  });
  return res.status;
}

export async function deliverWebhooks(limit = 20) {
  const due = await prisma.webhookDelivery.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    include: { webhook: { select: { url: true, secret: true, active: true } } },
  });

  for (const d of due) {
    // Claim: only one server instance wins each attempt. The lease pushes the
    // next attempt out so a crashed sender's row is retried later, not lost.
    const claimed = await prisma.webhookDelivery.updateMany({
      where: { id: d.id, status: "PENDING", attempts: d.attempts },
      data: { attempts: { increment: 1 }, nextAttemptAt: new Date(Date.now() + 5 * 60_000) },
    });
    if (claimed.count === 0) continue;
    const attempt = d.attempts + 1;

    if (!d.webhook.active) {
      await prisma.webhookDelivery.update({ where: { id: d.id }, data: { status: "FAILED", error: "Webhook disabled" } });
      continue;
    }

    let status: number | null = null;
    let error: string | null = null;
    try {
      status = await postWebhook(d.webhook, d.payload as unknown as WebhookPayload);
      if (status < 200 || status >= 300) error = `HTTP ${status}`;
    } catch (err) {
      error = err instanceof Error ? err.message.slice(0, 280) : "Delivery failed";
    }

    const ok = error === null;
    await prisma.$transaction([
      prisma.webhookDelivery.update({
        where: { id: d.id },
        data: ok
          ? { status: "SENT", responseCode: status, deliveredAt: new Date(), error: null }
          : attempt >= MAX_ATTEMPTS
            ? { status: "FAILED", responseCode: status, error }
            : { responseCode: status, error, nextAttemptAt: new Date(Date.now() + backoffMs(attempt)) },
      }),
      prisma.webhook.update({
        where: { id: d.webhookId },
        data: { lastStatus: status, lastError: error, ...(ok ? { lastDeliveredAt: new Date() } : {}) },
      }),
    ]);
  }
}

const NOTIFICATION_COPY: Record<string, (actor: string) => string> = {
  ASSIGNED: (a) => `${a} assigned you`,
  MENTIONED: (a) => `${a} mentioned you`,
  COMMENTED: (a) => `${a} commented`,
  STATUS_CHANGED: (a) => `${a} changed the status`,
  REGRESSED: () => "This error happened again after it was resolved",
  SLA_AT_RISK: () => "SLA at risk",
  SLA_BREACHED: () => "SLA breached",
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function deliverEmails(limit = 25) {
  if (!mailConfigured()) return;
  // Only recent notifications: a mail outage shouldn't end in a flood of stale alerts.
  const since = new Date(Date.now() - 48 * 3_600_000);
  const pending = await prisma.notification.findMany({
    where: { emailedAt: null, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      type: true,
      user: { select: { name: true, email: true, emailPrefs: true } },
      actor: { select: { name: true } },
      issue: { select: { number: true, title: true, project: { select: { key: true, name: true } } } },
    },
  });

  for (const n of pending) {
    const claimed = await prisma.notification.updateMany({ where: { id: n.id, emailedAt: null }, data: { emailedAt: new Date() } });
    if (claimed.count === 0 || !wantsEmail(n.user.emailPrefs, n.type)) continue;

    const key = issueKey(n.issue.project.key, n.issue.number);
    const headline = (NOTIFICATION_COPY[n.type] ?? (() => "Update"))(n.actor?.name ?? "Someone");
    const url = appUrl(`/projects/${n.issue.project.key}/issues/${n.issue.number}`);
    try {
      await sendMail({
        to: n.user.email,
        subject: `[${key}] ${headline}: ${n.issue.title}`.slice(0, 200),
        html: `
          <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;line-height:1.6;color:#18181b;max-width:520px;margin:0 auto;padding:24px">
            <p style="color:#71717a;margin:0 0 4px">${escapeHtml(n.issue.project.name)} · ${escapeHtml(key)}</p>
            <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(n.issue.title)}</h2>
            <p>${escapeHtml(headline)}.</p>
            <p style="margin:24px 0"><a href="${escapeHtml(url)}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open ${escapeHtml(key)}</a></p>
            <p style="color:#71717a;font-size:12px">You get this because of your notification settings.
              <a href="${escapeHtml(appUrl("/settings#email"))}" style="color:#71717a">Change which emails you receive</a>.</p>
          </div>`,
      });
    } catch (err) {
      console.error("Notification email failed", err);
    }
  }
}

export async function runOutbox() {
  await Promise.allSettled([deliverWebhooks(), deliverEmails()]).then((results) =>
    results.forEach((r) => r.status === "rejected" && console.error("Outbox run failed", r.reason)),
  );
}

/** Flush the outbox after the current response is sent (server actions and route handlers). */
export function scheduleOutbox() {
  after(runOutbox);
}
