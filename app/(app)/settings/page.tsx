import type { Metadata } from "next";
import { requireUser } from "@/lib/access";
import { handleFor } from "@/lib/constants";
import PageHeader from "@/components/PageHeader";
import AccountForms from "./AccountForms";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Account" subtitle={<>{user.email} · mention handle <span className="font-mono">@{handleFor(user.email)}</span></>} />
      <div className="mx-auto w-full max-w-xl p-4 sm:p-6">
        <AccountForms name={user.name} />
      </div>
    </>
  );
}
