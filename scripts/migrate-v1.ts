// Copies an Issue Logger v1 database into this (v2) database.
//
//   npm run migrate:v1 -- --source "postgresql://…v1…" [--dry-run] [--orphans-to owner@example.com]
//
// The v1 database is only read, never written, so a failed run can be retried
// after fixing the cause. Each v1 user keeps their email and password (bcrypt
// hashes carry over) and gets a private project holding their issues, because
// v1 issues were visible only to their author. Accounts that already exist in
// v2 (same email) are reused, not overwritten. See docs/DECISIONS.md.

import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { IMPORT_MARKER, planImport, type V1Issue, type V1User } from "../lib/v1-import";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const sourceUrl = arg("source") ?? process.env.V1_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
const dryRun = process.argv.includes("--dry-run");
const orphanOwner = arg("orphans-to");

async function main() {
  if (!sourceUrl) throw new Error("Pass --source <v1 database URL> (or set V1_DATABASE_URL).");
  if (!targetUrl) throw new Error("DATABASE_URL (the v2 database) is not set.");
  if (sourceUrl === targetUrl) throw new Error("Source and target are the same database. Import into a fresh v2 database.");

  const source = new pg.Client({ connectionString: sourceUrl });
  await source.connect();
  const prisma = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: targetUrl })) });

  try {
    // ─── Read v1 ────────────────────────────────────────────────────
    const tables = await source.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    const names = new Set(tables.rows.map((r) => r.table_name));
    if (!names.has("User") || !names.has("Issue")) throw new Error("The source doesn't look like a v1 database (no User/Issue tables).");

    const users: V1User[] = (await source.query(`SELECT id, name, email, "passwordHash", "emailVerified", "createdAt" FROM "User" ORDER BY id`)).rows;
    const issues: V1Issue[] = (
      await source.query(`SELECT id, title, description, status::text, priority::text, "createdAt", "updatedAt", "userId" FROM "Issue" ORDER BY id`)
    ).rows;

    // ─── Plan ───────────────────────────────────────────────────────
    if (await prisma.project.count({ where: { description: { contains: IMPORT_MARKER } } })) {
      throw new Error("This v2 database already contains imported v1 projects. Import into a fresh database instead.");
    }
    if (orphanOwner && !users.some((u) => u.email.toLowerCase() === orphanOwner.toLowerCase())) {
      if (!(await prisma.user.findUnique({ where: { email: orphanOwner.toLowerCase() } }))) {
        throw new Error(`--orphans-to ${orphanOwner} matches no v1 or v2 account.`);
      }
    }
    const existing = await prisma.user.findMany({ where: { email: { in: users.map((u) => u.email.toLowerCase()) } }, select: { email: true } });
    const takenKeys = new Set((await prisma.project.findMany({ select: { key: true } })).map((p) => p.key));
    const plan = planImport({ users, issues, existingEmails: new Set(existing.map((e) => e.email)), takenKeys, orphanOwnerEmail: orphanOwner });

    console.log(`v1 source: ${users.length} users, ${issues.length} issues`);
    console.log(`  accounts to create: ${plan.users.filter((u) => !u.exists).length} (already in v2: ${plan.users.filter((u) => u.exists).length})`);
    for (const p of plan.projects) console.log(`  project ${p.key} "${p.name}" → ${p.issues.length} issues, owner ${p.ownerEmail}`);
    if (plan.orphans) console.log(`  skipped: ${plan.orphans} issues whose author no longer exists (use --orphans-to <email> to keep them)`);
    if (dryRun) {
      console.log("Dry run: nothing written.");
      return;
    }

    // ─── Write v2 ───────────────────────────────────────────────────
    await prisma.$transaction(
      async (tx) => {
        for (const u of plan.users.filter((x) => !x.exists)) {
          await tx.user.create({ data: { email: u.email, name: u.name, passwordHash: u.passwordHash, emailVerified: u.emailVerified, createdAt: u.createdAt } });
        }
        const ids = new Map(
          (await tx.user.findMany({ where: { email: { in: plan.projects.map((p) => p.ownerEmail) } }, select: { id: true, email: true } })).map((u) => [u.email, u.id]),
        );
        for (const p of plan.projects) {
          const ownerId = ids.get(p.ownerEmail)!;
          const project = await tx.project.create({
            data: {
              key: p.key,
              name: p.name,
              // No SLA targets: old issues would all show as breached. Owners can turn SLAs on in settings.
              description: `${IMPORT_MARKER} Private to its owner until they invite others.`,
              issueCounter: p.issues.length,
              members: { create: { userId: ownerId, role: "OWNER" } },
            },
          });
          for (const i of p.issues) {
            await tx.issue.create({
              data: {
                projectId: project.id,
                number: i.number,
                title: i.title,
                description: i.description,
                status: i.status,
                priority: i.priority,
                type: "TASK",
                position: i.number * 1024,
                reporterId: ownerId,
                // v1 issues belonged to their author; keep open ones on their plate.
                assigneeId: i.status === "DONE" ? null : ownerId,
                createdAt: i.createdAt,
                updatedAt: i.updatedAt,
                closedAt: i.closedAt,
                activities: { create: { kind: "CREATED", actorId: ownerId, createdAt: i.createdAt } },
              },
            });
          }
        }
      },
      { timeout: 120_000 },
    );
    console.log(`Imported ${plan.projects.reduce((s, p) => s + p.issues.length, 0)} issues into ${plan.projects.length} projects.`);
  } finally {
    await source.end();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
