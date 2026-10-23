"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ActionError, authorizeProject } from "@/lib/access";
import { run, type ActionResult } from "@/lib/action";
import { randomToken } from "@/lib/tokens";
import { WEBHOOK_EVENTS, checkWebhookUrl, type WebhookPayload } from "@/lib/webhooks";
import { postWebhook } from "@/lib/outbox";

const EVENT_NAMES = WEBHOOK_EVENTS.map((e) => e.event) as [string, ...string[]];

const webhookSchema = z.object({
  url: z.string().trim().max(500),
  events: z.array(z.enum(EVENT_NAMES)).min(1, "Pick at least one event"),
});

async function loadWebhook(id: string) {
  const hook = await prisma.webhook.findUnique({ where: { id }, include: { project: { select: { key: true, name: true } } } });
  if (!hook) throw new ActionError("Webhook not found.");
  await authorizeProject(hook.projectId, "project:manage");
  return hook;
}

function refresh(key: string) {
  revalidatePath(`/projects/${key}/settings`);
}

/** Creates a webhook and returns its signing secret (shown to the user once). */
export async function createWebhook(projectId: string, input: unknown): Promise<ActionResult<{ secret: string }>> {
  return run(async () => {
    const { user } = await authorizeProject(projectId, "project:manage");
    const data = webhookSchema.parse(input);
    const problem = checkWebhookUrl(data.url, { allowLocal: process.env.NODE_ENV !== "production" });
    if (problem) throw new ActionError(problem);
    if ((await prisma.webhook.count({ where: { projectId } })) >= 10) throw new ActionError("A project can have up to 10 webhooks.");

    const secret = `whsec_${randomToken(24)}`;
    const hook = await prisma.webhook.create({
      data: { projectId, url: data.url, events: data.events, secret, createdById: user.id },
      include: { project: { select: { key: true } } },
    });
    refresh(hook.project.key);
    return { secret };
  });
}

export async function updateWebhook(id: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const hook = await loadWebhook(id);
    const data = z.object({ active: z.boolean().optional(), events: webhookSchema.shape.events.optional() }).parse(input);
    await prisma.webhook.update({ where: { id }, data });
    refresh(hook.project.key);
    return undefined;
  });
}

export async function deleteWebhook(id: string): Promise<ActionResult> {
  return run(async () => {
    const hook = await loadWebhook(id);
    await prisma.webhook.delete({ where: { id } });
    refresh(hook.project.key);
    return undefined;
  });
}

/** Sends a test event straight away (bypassing the outbox) and reports the HTTP status. */
export async function sendTestWebhook(id: string): Promise<ActionResult<{ status: number }>> {
  return run(async () => {
    const hook = await loadWebhook(id);
    const payload: WebhookPayload = {
      event: "webhook.test",
      occurredAt: new Date().toISOString(),
      project: { key: hook.project.key, name: hook.project.name },
      actor: null,
    };
    let status: number;
    try {
      status = await postWebhook(hook, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      await prisma.webhook.update({ where: { id }, data: { lastStatus: null, lastError: message.slice(0, 280) } });
      refresh(hook.project.key);
      throw new ActionError(`Test failed: ${message}`);
    }
    const ok = status >= 200 && status < 300;
    await prisma.webhook.update({
      where: { id },
      data: { lastStatus: status, lastError: ok ? null : `HTTP ${status}`, ...(ok ? { lastDeliveredAt: new Date() } : {}) },
    });
    refresh(hook.project.key);
    if (!ok) throw new ActionError(`The endpoint answered HTTP ${status}.`);
    return { status };
  });
}
