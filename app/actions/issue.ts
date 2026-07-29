"use server";

import { prisma } from "@/lib/db";
import { createIssueSchema, editIssueSchema } from "@/app/validationSchemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type IssueFormData = z.infer<typeof createIssueSchema>;
type EditIssueFormData = z.infer<typeof editIssueSchema>;

export async function createIssue(data: IssueFormData) {
  // 1. Validate data on the server
  const validation = createIssueSchema.safeParse(data);
  if (!validation.success) {
    const { fieldErrors } = z.flattenError(validation.error);
    return { success: false, errors: fieldErrors };
  }

  // 2. Perform Prisma mutation
  try {
    const newIssue = await prisma.issue.create({
      data: {
        title: validation.data.title,
        description: validation.data.description,
        priority: validation.data.priority,
      },
    });

    revalidatePath("/issues");
    revalidatePath("/");

    return { success: true, data: newIssue };
  } catch (error) {
    console.error("Failed to create issue", error);
    return {
      success: false,
      error: "Unable to create issue.",
    };
  }
}

export async function updateIssue(id: number, data: EditIssueFormData) {
  const validation = editIssueSchema.safeParse(data);
  if (!validation.success) {
    const { fieldErrors } = z.flattenError(validation.error);
    return { success: false, errors: fieldErrors };
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
  await prisma.issue.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/issues");
  revalidatePath("/");
}

export async function deleteIssue(id: number) {
  await prisma.issue.delete({
    where: { id },
  });
  revalidatePath("/issues");
  revalidatePath("/");
}
