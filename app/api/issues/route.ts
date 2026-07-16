import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createIssueSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = createIssueSchema.safeParse(body);
  if (!validation.success) {
    const flattenedError = z.flattenError(validation.error);
    const fieldErrors = flattenedError.fieldErrors;
    return NextResponse.json(fieldErrors, { status: 400 });
  }
}
