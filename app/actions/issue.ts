"use server";

import { prisma } from "@/lib/db";
import { createIssueSchema, editIssueSchema } from "@/app/validationSchemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";

type IssueFormData = z.infer<typeof createIssueSchema>;
type EditIssueFormData = z.infer<typeof editIssueSchema>;

/** Resolve the current user's numeric id from the JWT session, or null. */
async function getCurrentUserId(): Promise<number | null> {
  const session = await auth();
  const raw = session?.user?.id;
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

export async function createIssue(data: IssueFormData) {
  const userId = await getCurrentUserId();
  const validation = createIssueSchema.safeParse(data);
  if (!validation.success) {
    const { fieldErrors } = z.flattenError(validation.error);
    return { success: false, errors: fieldErrors };
  }

  try {
    const newIssue = await prisma.issue.create({
      data: {
        title: validation.data.title,
        description: validation.data.description,
        priority: validation.data.priority,
        ...(userId ? { userId } : {}),
      },
    });

    revalidatePath("/issues");
    revalidatePath("/");
    return { success: true, data: newIssue };
  } catch (error) {
    console.error("Failed to create issue", error);
    return { success: false, error: "Unable to create issue." };
  }
}

export async function updateIssue(id: number, data: EditIssueFormData) {
  const userId = await getCurrentUserId();
  const validation = editIssueSchema.safeParse(data);
  if (!validation.success) {
    const { fieldErrors } = z.flattenError(validation.error);
    return { success: false, errors: fieldErrors };
  }

  // Verify ownership
  if (userId) {
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue || issue.userId !== userId) {
      return { success: false, error: "Not authorised to edit this issue." };
    }
  }

  try {
    const updated = await prisma.issue.update({
      where: { id },
      data: {
        title: validation.data.title,
        description: validation.data.description,
        priority: validation.data.priority,
      },
    });
    revalidatePath("/issues");
    revalidatePath("/");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to update issue", error);
    return { success: false, error: "Unable to update issue." };
  }
}

export async function updateIssueStatus(
  id: number,
  status: "IN_PROGRESS" | "CLOSED" | "OPEN" = "IN_PROGRESS"
) {
  const userId = await getCurrentUserId();
  if (userId) {
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue || issue.userId !== userId) return;
  }

  await prisma.issue.update({ where: { id }, data: { status } });
  revalidatePath("/issues");
  revalidatePath("/");
}

export async function deleteIssue(id: number) {
  const userId = await getCurrentUserId();
  if (userId) {
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue || issue.userId !== userId) return;
  }

  await prisma.issue.delete({ where: { id } });
  revalidatePath("/issues");
  revalidatePath("/");
}
