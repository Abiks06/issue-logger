import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/access";
import { resolveEmailPrefs } from "@/lib/email-prefs";
import { issueKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** GET /api/account/export — the signed-in user's data as JSON. No secrets (password hash, tokens). */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const [user, memberships, reported, assigned, comments] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true, email: true, emailVerified: true, createdAt: true, emailPrefs: true } }),
    prisma.projectMember.findMany({ where: { userId: me.id }, select: { role: true, createdAt: true, project: { select: { key: true, name: true } } } }),
    prisma.issue.findMany({ where: { reporterId: me.id }, select: issueFields, orderBy: { createdAt: "asc" } }),
    prisma.issue.findMany({ where: { assigneeId: me.id }, select: issueFields, orderBy: { createdAt: "asc" } }),
    prisma.comment.findMany({
      where: { authorId: me.id },
      orderBy: { createdAt: "asc" },
      select: { body: true, createdAt: true, updatedAt: true, issue: { select: { number: true, project: { select: { key: true } } } } },
    }),
  ]);

  const shape = (i: (typeof reported)[number]) => ({ ...i, key: issueKey(i.project.key, i.number), project: i.project.key });
  const body = {
    exportedAt: new Date().toISOString(),
    profile: { ...user, emailPrefs: resolveEmailPrefs(user.emailPrefs) },
    projects: memberships.map((m) => ({ key: m.project.key, name: m.project.name, role: m.role, joinedAt: m.createdAt })),
    issuesReported: reported.map(shape),
    issuesAssigned: assigned.map(shape),
    comments: comments.map((c) => ({ issue: issueKey(c.issue.project.key, c.issue.number), body: c.body, createdAt: c.createdAt, updatedAt: c.updatedAt })),
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="issue-logger-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

const issueFields = {
  number: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  type: true,
  dueDate: true,
  createdAt: true,
  closedAt: true,
  project: { select: { key: true } },
} as const;
