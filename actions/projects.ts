"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ActionError, authorizeProject, currentUser } from "@/lib/access";
import { run, type ActionResult } from "@/lib/action";
import { canChangeRole, canRemoveMember } from "@/lib/permissions";
import { generateApiKey } from "@/lib/tokens";
import { ROLES, type Role } from "@/lib/constants";
import { apiKeySchema, inviteSchema, labelSchema, projectSchema, projectSettingsSchema } from "@/lib/validation";
import { z } from "zod";

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

export async function addMember(projectId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { role } = await authorizeProject(projectId, "project:manage");
    const data = inviteSchema.parse(input);
    if (!canChangeRole(role, "VIEWER", data.role)) {
      throw new ActionError("You can only add members with a role below your own.");
    }
    const invitee = await prisma.user.findUnique({ where: { email: data.email } });
    if (!invitee) throw new ActionError("No account uses that email yet. Ask them to sign up first.");

    try {
      const m = await prisma.projectMember.create({
        data: { projectId, userId: invitee.id, role: data.role },
        include: { project: { select: { key: true } } },
      });
      refresh(m.project.key);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ActionError("They're already a member of this project.");
      }
      throw err;
    }
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
