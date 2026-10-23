import { NextResponse } from "next/server";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Clears a session whose account no longer exists (see requireUser). Only acts
 * in that case, so a link to this URL can't sign out a real user.
 */
export async function GET(request: Request) {
  const session = await auth();
  const id = session?.user?.id;
  const exists = id ? await prisma.user.count({ where: { id } }) : 0;
  if (!id || exists) return NextResponse.redirect(new URL("/", request.url));
  await signOut({ redirectTo: "/auth/login" });
}
