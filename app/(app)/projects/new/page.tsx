import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ProjectForm from "./ProjectForm";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="New project" subtitle="You'll be the owner. Invite teammates from project settings." />
      <div className="mx-auto max-w-xl p-4 sm:p-6">
        <ProjectForm />
      </div>
    </>
  );
}
