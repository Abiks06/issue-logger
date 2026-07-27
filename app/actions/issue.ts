"use server";

import { prisma } from "@/lib/db";
import { createIssueSchema } from "@/app/validationSchemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type IssueFormData = z.infer<typeof createIssueSchema>;

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
      },
    });

    // Refresh cached issue list UI on creation
    revalidatePath("/issues");

    return { success: true, data: newIssue };
  } catch (error) {
    console.error("Failed to create issue", error);
    return {
      success: false,
      error: "Unable to create issue.",
    };
  }
}