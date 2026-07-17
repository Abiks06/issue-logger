import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createIssueSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = createIssueSchema.safeParse(body);
  if (!validation.success) {
    const flattenedError = z.flattenError(validation.error);
    const fieldErrors = flattenedError.fieldErrors;
    return NextResponse.json(fieldErrors, { status: 400 });
  }

  try {
    const newIssue = await prisma.issue.create({
      data: {
        title: body.title,
        description: body.description,
      },
    });

    return NextResponse.json(newIssue, { status: 201 });
  } catch (error) {
    console.error("Failed to create issue", error);
    return NextResponse.json(
      { error: "Unable to create issue. Please verify the database is configured and reachable." },
      { status: 500 },
    );
  }
}
