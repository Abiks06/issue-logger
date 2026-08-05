import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const secret = request.headers.get("x-clear-db-secret");
  const expected = process.env.CLEAR_DB_SECRET;

  if (!expected) {
    return NextResponse.json(
      { success: false, message: "CLEAR_DB_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (!secret || secret !== expected) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  await prisma.issue.deleteMany();
  await prisma.user.deleteMany();

  return NextResponse.json({ success: true, message: "Database cleared." });
}
