import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can, type Capability } from "@/lib/permissions";
import type { Role } from "@/lib/constants";

// Request-scoped access checks. `cache` dedupes them across the layout,
// page and components that render in the same request.

export const currentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
});

/** Signed-in user, or a redirect to the login page (for pages). */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/auth/login");
  return user;
}

export const projectAccess = cache(async (key: string) => {
  const user = await currentUser();
  if (!user) return null;
  const membership = await prisma.projectMember.findFirst({
    where: { userId: user.id, project: { key: key.toUpperCase() } },
    select: { role: true, project: true },
  });
  if (!membership) return null;
  return { user, project: membership.project, role: membership.role as Role };
});

/**
 * Project the current user belongs to, or 404 (for pages). Non-members get
 * the same 404 as a missing project so keys can't be probed.
 */
export async function requireProject(key: string, capability: Capability = "project:view") {
  await requireUser();
  const access = await projectAccess(key);
  if (!access || !can(access.role, capability)) notFound();
  return access;
}

export class ActionError extends Error {}

/** Same as requireProject but by id, throwing ActionError (for server actions). */
export async function authorizeProject(projectId: string, capability: Capability) {
  const user = await currentUser();
  if (!user) throw new ActionError("You need to sign in again.");
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { role: true },
  });
  if (!member) throw new ActionError("Project not found.");
  if (!can(member.role, capability)) throw new ActionError("You don't have permission to do that.");
  return { user, role: member.role as Role };
}
