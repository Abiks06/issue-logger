import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/access";
import AppShell from "@/components/AppShell";
import { after } from "next/server";
import { maybeSweepSla } from "@/lib/sla-sweep";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Keep SLA alerts flowing without a scheduler; throttled to once a minute.
  after(maybeSweepSla);
  const [projects, unread] = await Promise.all([
    prisma.project.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: { name: "asc" },
      select: { key: true, name: true, color: true },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return (
    <AppShell user={user} projects={projects} unread={unread}>
      {children}
    </AppShell>
  );
}
