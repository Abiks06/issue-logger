"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ActionError, authorizeProject, currentUser } from "@/lib/access";
import { run, type ActionResult } from "@/lib/action";
import { canChangeRole, canRemoveMember } from "@/lib/permissions";
import { generateApiKey } from "@/lib/tokens";
import { PRIORITIES, ROLES, STATUSES, type Role, type Status } from "@/lib/constants";
import { insertIssue } from "@/lib/issue-service";
import { DEFAULT_TARGETS } from "@/lib/sla";
import { baselineSlaAlerts } from "@/lib/sla-sweep";
import { apiKeySchema, inviteSchema, labelSchema, projectSchema, projectSettingsSchema } from "@/lib/validation";
import { z } from "zod";
import { actionEmail, appUrl, mailConfigured, sendMail } from "@/lib/mail";

const DEFAULT_LABELS = [
  { name: "frontend", color: "#06b6d4" },
  { name: "backend", color: "#8b5cf6" },
  { name: "infra", color: "#f97316" },
  { name: "regression", color: "#ef4444" },
];

function refresh(key?: string) {
  revalidatePath("/", "layout");
  if (key) revalidatePath(`/projects/${key}`, "layout");
}

// ─── Projects ─────────────────────────────────────────────────────────

export async function createProject(input: unknown): Promise<ActionResult<{ key: string }>> {
  return run(async () => {
    const user = await currentUser();
    if (!user) throw new ActionError("You need to sign in again.");
    const data = projectSchema.parse(input);
    try {
      const project = await prisma.project.create({
        data: {
          ...data,
          members: { create: { userId: user.id, role: "OWNER" } },
          labels: { create: DEFAULT_LABELS },
          slaTargets: {
            create: PRIORITIES.filter((p) => DEFAULT_TARGETS[p].resolve).map((priority) => ({
              priority,
              respondMinutes: DEFAULT_TARGETS[priority].respond,
              resolveMinutes: DEFAULT_TARGETS[priority].resolve,
            })),
          },
        },
      });
      refresh();
      return { key: project.key };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ActionError(`The key ${data.key} is already taken.`);
      }
      throw err;
    }
  });
}

export async function updateProject(projectId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    await authorizeProject(projectId, "project:manage");
    const data = projectSettingsSchema.parse(input);
    const project = await prisma.project.update({ where: { id: projectId }, data });
    refresh(project.key);
    return undefined;
  });
}

export async function deleteProject(projectId: string, confirmKey: string): Promise<ActionResult> {
  return run(async () => {
    await authorizeProject(projectId, "project:delete");
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    if (project.key !== confirmKey.trim().toUpperCase()) {
      throw new ActionError(`Type ${project.key} to confirm.`);
    }
    await prisma.project.delete({ where: { id: projectId } });
    refresh();
    return undefined;
  });
}

// ─── Members ──────────────────────────────────────────────────────────

/**
 * Adds an existing user straight away, or records an invite for an email with
 * no account yet (accepted automatically when they sign up).
 */
export async function addMember(projectId: string, input: unknown): Promise<ActionResult<{ invited: boolean }>> {
  return run(async () => {
    const { user, role } = await authorizeProject(projectId, "project:manage");
    const data = inviteSchema.parse(input);
    if (!canChangeRole(role, "VIEWER", data.role)) {
      throw new ActionError("You can only add members with a role below your own.");
    }
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { key: true, name: true } });
    const invitee = await prisma.user.findUnique({ where: { email: data.email } });

    if (!invitee) {
      await prisma.projectInvite.upsert({
        where: { projectId_email: { projectId, email: data.email } },
        create: { projectId, email: data.email, role: data.role, invitedById: user.id },
        update: { role: data.role, invitedById: user.id },
      });
      if (mailConfigured()) {
        await sendMail({
          to: data.email,
          subject: `${user.name} invited you to ${project.name} on Issue Logger`,
          html: actionEmail({
            heading: `Join ${project.name}`,
            greetingName: "there",
            body: `${user.name} invited you to the ${project.name} project. Create an account with this email address and you'll be added automatically.`,
            cta: "Create your account",
            url: appUrl(`/auth/register?email=${encodeURIComponent(data.email)}`),
          }),
        }).catch((err) => console.error("Invite email failed", err));
      }
      refresh(project.key);
      return { invited: true };
    }

    try {
      await prisma.projectMember.create({ data: { projectId, userId: invitee.id, role: data.role } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ActionError("They're already a member of this project.");
      }
      throw err;
    }
    refresh(project.key);
    return { invited: false };
  });
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  return run(async () => {
    const invite = await prisma.projectInvite.findUnique({
      where: { id: inviteId },
      include: { project: { select: { key: true } } },
    });
    if (!invite) throw new ActionError("Invite not found.");
    await authorizeProject(invite.projectId, "project:manage");
    await prisma.projectInvite.delete({ where: { id: inviteId } });
    refresh(invite.project.key);
    return undefined;
  });
}

export async function changeMemberRole(memberId: string, nextRole: Role): Promise<ActionResult> {
  return run(async () => {
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: { project: { select: { key: true } } },
    });
    if (!member) throw new ActionError("Member not found.");
    const { user, role } = await authorizeProject(member.projectId, "project:manage");
    const target = z.enum(ROLES).parse(nextRole);

    if (member.userId === user.id) throw new ActionError("You can't change your own role.");
    if (!canChangeRole(role, member.role, target)) throw new ActionError("You don't have permission to do that.");

    await prisma.projectMember.update({ where: { id: memberId }, data: { role: target } });
    refresh(member.project.key);
    return undefined;
  });
}

export async function removeMember(memberId: string): Promise<ActionResult<{ left: boolean }>> {
  return run(async () => {
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: { project: { select: { key: true } } },
    });
    if (!member) throw new ActionError("Member not found.");
    const { user, role } = await authorizeProject(member.projectId, "project:view");
    const leaving = member.userId === user.id;

    if (!leaving && !canRemoveMember(role, member.role)) {
      throw new ActionError("You don't have permission to do that.");
    }
    if (member.role === "OWNER") {
      const owners = await prisma.projectMember.count({ where: { projectId: member.projectId, role: "OWNER" } });
      if (owners <= 1) throw new ActionError("A project needs at least one owner. Transfer ownership first.");
    }

    await prisma.$transaction([
      // Unassign their open work so it doesn't sit with someone who can't see it.
      prisma.issue.updateMany({
        where: { projectId: member.projectId, assigneeId: member.userId },
        data: { assigneeId: null },
      }),
      prisma.projectMember.delete({ where: { id: memberId } }),
    ]);
    refresh(member.project.key);
    return { left: leaving };
  });
}

// ─── Labels ───────────────────────────────────────────────────────────

export async function createLabel(projectId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    await authorizeProject(projectId, "project:manage");
    const data = labelSchema.parse(input);
    try {
      const label = await prisma.label.create({
        data: { ...data, projectId },
        include: { project: { select: { key: true } } },
      });
      refresh(label.project.key);
      return { id: label.id };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ActionError("A label with that name already exists.");
      }
      throw err;
    }
  });
}

export async function deleteLabel(labelId: string): Promise<ActionResult> {
  return run(async () => {
    const label = await prisma.label.findUnique({
      where: { id: labelId },
      include: { project: { select: { key: true } } },
    });
    if (!label) throw new ActionError("Label not found.");
    await authorizeProject(label.projectId, "project:manage");
    await prisma.label.delete({ where: { id: labelId } });
    refresh(label.project.key);
    return undefined;
  });
}

// ─── API keys ─────────────────────────────────────────────────────────

/** Creates a key and returns the secret. It is never retrievable again. */
export async function createApiKey(projectId: string, input: unknown): Promise<ActionResult<{ secret: string }>> {
  return run(async () => {
    const { user } = await authorizeProject(projectId, "project:manage");
    const data = apiKeySchema.parse(input);
    const active = await prisma.apiKey.count({ where: { projectId, revokedAt: null } });
    if (active >= 10) throw new ActionError("Revoke an existing key before creating another (limit 10).");

    const { secret, prefix, hashedKey } = generateApiKey();
    const key = await prisma.apiKey.create({
      data: { projectId, name: data.name, prefix, hashedKey, createdById: user.id },
      include: { project: { select: { key: true } } },
    });
    refresh(key.project.key);
    return { secret };
  });
}

export async function revokeApiKey(apiKeyId: string): Promise<ActionResult> {
  return run(async () => {
    const key = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      include: { project: { select: { key: true } } },
    });
    if (!key) throw new ActionError("API key not found.");
    await authorizeProject(key.projectId, "project:manage");
    await prisma.apiKey.update({ where: { id: apiKeyId }, data: { revokedAt: new Date() } });
    refresh(key.project.key);
    return undefined;
  });
}

// ─── Saved views ──────────────────────────────────────────────────────

const savedViewSchema = z.object({
  name: z.string().trim().min(1, "Name the view").max(40),
  // A list-view query string such as "?status=TODO&assignee=me".
  query: z.string().max(1000).regex(/^\?[\w%.,=&+-]*$/, "Invalid filter"),
});

export async function createSavedView(projectId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { user } = await authorizeProject(projectId, "project:view");
    const data = savedViewSchema.parse(input);
    const count = await prisma.savedView.count({ where: { projectId, userId: user.id } });
    if (count >= 20) throw new ActionError("You can save up to 20 views per project.");
    const view = await prisma.savedView.create({
      data: { ...data, projectId, userId: user.id },
      include: { project: { select: { key: true } } },
    });
    refresh(view.project.key);
    return { id: view.id };
  });
}

export async function deleteSavedView(viewId: string): Promise<ActionResult> {
  return run(async () => {
    const user = await currentUser();
    const view = await prisma.savedView.findUnique({ where: { id: viewId }, include: { project: { select: { key: true } } } });
    if (!user || !view || view.userId !== user.id) throw new ActionError("View not found.");
    await prisma.savedView.delete({ where: { id: viewId } });
    refresh(view.project.key);
    return undefined;
  });
}

// ─── Workflow: SLA targets and WIP limits ─────────────────────────────

const hours = z.number().min(0.25).max(24 * 90).nullable();
const workflowSchema = z.object({
  sla: z.array(z.object({ priority: z.enum(PRIORITIES), respondHours: hours, resolveHours: hours })).max(PRIORITIES.length),
  wip: z.partialRecord(z.enum(STATUSES), z.number().int().min(1).max(999).nullable()),
});

export async function updateWorkflow(projectId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    await authorizeProject(projectId, "project:manage");
    const data = workflowSchema.parse(input);
    const wipLimits = Object.fromEntries(Object.entries(data.wip).filter(([, v]) => typeof v === "number"));
    const toMinutes = (h: number | null) => (h === null ? null : Math.round(h * 60));

    const project = await prisma.$transaction(async (tx) => {
      for (const row of data.sla) {
        const respondMinutes = toMinutes(row.respondHours);
        const resolveMinutes = toMinutes(row.resolveHours);
        if (respondMinutes === null && resolveMinutes === null) {
          await tx.slaTarget.deleteMany({ where: { projectId, priority: row.priority } });
        } else {
          await tx.slaTarget.upsert({
            where: { projectId_priority: { projectId, priority: row.priority } },
            create: { projectId, priority: row.priority, respondMinutes, resolveMinutes },
            update: { respondMinutes, resolveMinutes },
          });
        }
      }
      return tx.project.update({ where: { id: projectId }, data: { wipLimits }, select: { key: true } });
    });
    // Re-baseline under the new targets so saving doesn't alert on the whole backlog.
    await baselineSlaAlerts(projectId);
    refresh(project.key);
    return undefined;
  });
}

// ─── Sample project (onboarding) ──────────────────────────────────────

const SAMPLE_ISSUES: { title: string; status: Status; priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW"; type: "BUG" | "FEATURE" | "TASK"; estimate: number; label: string; description: string }[] = [
  { title: "Drag me to another column", status: "TODO", priority: "MEDIUM", type: "TASK", estimate: 1, label: "frontend", description: "Cards move between columns on the **Board** tab. Moving one here updates its status and history." },
  { title: "Open me to see sub-issues and comments", status: "IN_PROGRESS", priority: "HIGH", type: "FEATURE", estimate: 3, label: "frontend", description: "Issues can be split into sub-issues, discussed in comments (type `@` to mention someone) and tracked on a timeline." },
  { title: "Checkout fails for some cards", status: "TODO", priority: "URGENT", type: "BUG", estimate: 5, label: "backend", description: "Urgent issues have an SLA: respond within 1 hour, resolve within 8. Watch the clock in the sidebar." },
  { title: "Try the list view with filters", status: "BACKLOG", priority: "LOW", type: "TASK", estimate: 1, label: "frontend", description: "Filter by status, priority, assignee or SLA state, then **Save view** to keep the filter." },
  { title: "Send an error from your app", status: "BACKLOG", priority: "MEDIUM", type: "TASK", estimate: 2, label: "infra", description: "Create an API key under **Settings → API keys** and copy a snippet. Repeated errors group into one issue." },
  { title: "Ship the onboarding checklist", status: "DONE", priority: "MEDIUM", type: "FEATURE", estimate: 3, label: "frontend", description: "Done issues count towards velocity on the **Insights** tab." },
];

/** Creates a small, explorable project for a new account. Delete it any time from its settings. */
export async function createSampleProject(): Promise<ActionResult<{ key: string }>> {
  return run(async () => {
    const user = await currentUser();
    if (!user) throw new ActionError("You need to sign in again.");
    const taken = new Set((await prisma.project.findMany({ where: { key: { startsWith: "TOUR" } }, select: { key: true } })).map((p) => p.key));
    const key = ["TOUR", ...Array.from({ length: 98 }, (_, i) => `TOUR${i + 2}`)].find((k) => !taken.has(k));
    if (!key) throw new ActionError("Couldn't pick a key for the sample project.");

    const project = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          key,
          name: "Sample project",
          description: "A sandbox to explore Issue Logger. Delete it from Settings when you're done.",
          color: "#14b8a6",
          members: { create: { userId: user.id, role: "OWNER" } },
          labels: { create: DEFAULT_LABELS },
          slaTargets: {
            create: PRIORITIES.filter((pr) => DEFAULT_TARGETS[pr].resolve).map((priority) => ({
              priority,
              respondMinutes: DEFAULT_TARGETS[priority].respond,
              resolveMinutes: DEFAULT_TARGETS[priority].resolve,
            })),
          },
        },
        include: { labels: true },
      });
      const created: { id: string; title: string }[] = [];
      for (const s of SAMPLE_ISSUES) {
        const issue = await insertIssue(tx, p.id, {
          title: s.title,
          description: s.description,
          status: s.status,
          priority: s.priority,
          type: s.type,
          estimate: s.estimate,
          reporterId: user.id,
          assigneeId: s.status === "DONE" ? null : user.id,
          labelIds: p.labels.filter((l) => l.name === s.label).map((l) => l.id),
        });
        created.push({ id: issue.id, title: s.title });
      }
      const parent = created[1];
      await insertIssue(tx, p.id, { title: "A sub-issue of the one above", status: "TODO", priority: "LOW", type: "TASK", reporterId: user.id, parentId: parent.id });
      await tx.comment.create({ data: { issueId: parent.id, authorId: user.id, body: "Comments support **Markdown**, checklists and `code`.\n\n- [x] Open an issue\n- [ ] Leave a comment" } });
      return p;
    });

    await baselineSlaAlerts(project.id);
    refresh(project.key);
    return { key: project.key };
  });
}
