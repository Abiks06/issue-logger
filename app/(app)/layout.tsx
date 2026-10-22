import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/access";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
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
