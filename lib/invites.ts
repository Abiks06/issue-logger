import "server-only";
import { prisma } from "@/lib/db";

/** Turns every pending invite for `email` into a project membership. */
export async function acceptPendingInvites(userId: string, email: string) {
  const invites = await prisma.projectInvite.findMany({ where: { email } });
  if (invites.length === 0) return 0;
  await prisma.$transaction([
    prisma.projectMember.createMany({
      data: invites.map((i) => ({ projectId: i.projectId, userId, role: i.role })),
      skipDuplicates: true,
    }),
    prisma.projectInvite.deleteMany({ where: { email } }),
  ]);
  return invites.length;
}
