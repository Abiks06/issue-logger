import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/access";
import { handleFor } from "@/lib/constants";
import { resolveEmailPrefs } from "@/lib/email-prefs";
import { mailConfigured } from "@/lib/mail";
import PageHeader from "@/components/PageHeader";
import AccountForms from "./AccountForms";
import { DataAndDeletion, EmailPrefsForm } from "./AccountExtras";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const [session, row] = await Promise.all([auth(), prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { emailPrefs: true } })]);
  return (
    <>
      <PageHeader title="Account" subtitle={<>{user.email} · mention handle <span className="font-mono">@{handleFor(user.email)}</span></>} />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-4 sm:p-6">
        <AccountForms name={user.name} remembered={session?.remember !== false} />
        <EmailPrefsForm initial={resolveEmailPrefs(row.emailPrefs)} mailEnabled={mailConfigured()} />
        <DataAndDeletion />
      </div>
    </>
  );
}
