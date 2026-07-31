"use client";

import dynamic from "next/dynamic";
import { Callout, Spinner } from "@radix-ui/themes";
import "easymde/dist/easymde.min.css";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { editIssueSchema } from "@/app/validationSchemas";
import { z } from "zod";
import { updateIssue } from "@/app/actions/issue";
import ErrorMessage from "@/app/components/ErrorMessage";
import Link from "next/link";
import toast from "react-hot-toast";
import type { Issue } from "@prisma/client";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-56 w-full animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
  ),
});

type EditForm = z.infer<typeof editIssueSchema>;

const PRIORITY_OPTIONS: { value: EditForm["priority"]; label: string; colour: string }[] = [
  { value: "LOW", label: "Low", colour: "text-sky-700 dark:text-sky-400" },
  { value: "MEDIUM", label: "Medium", colour: "text-amber-700 dark:text-amber-400" },
  { value: "HIGH", label: "High", colour: "text-orange-700 dark:text-orange-400" },
  { value: "CRITICAL", label: "Critical", colour: "text-rose-700 dark:text-rose-400" },
];

interface EditIssueFormProps {
  issue: Issue;
}

export default function EditIssueForm({ issue }: EditIssueFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editIssueSchema),
    defaultValues: {
      title: issue.title,
      description: issue.description,
      priority: issue.priority as EditForm["priority"],
    },
  });
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      setError("");
      try {
        const result = await updateIssue(issue.id, data);
        if (!result.success) {
          const message = result.errors
            ? Object.values(result.errors).flat().join(" ")
            : result.error || "Failed to update issue.";
          setError(message);
          return;
        }
        toast.success("Issue updated!");
        router.push("/issues");
      } catch {
        setError("An unexpected error occurred.");
      }
    });
  });

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-200">Dashboard</Link>
          <span>›</span>
          <Link href="/issues" className="hover:text-slate-700 dark:hover:text-slate-200">Issues</Link>
          <span>›</span>
          <span className="text-slate-700 dark:text-slate-200">Edit #{issue.id}</span>
        </nav>

        <div className="card-shadow-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">
              Editing Issue #{issue.id}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Edit Issue
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Update the title, priority, or description below.
            </p>
          </div>

          {error && (
            <Callout.Root variant="surface" size="2" color="red" highContrast className="mb-5 w-full">
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <form className="flex w-full flex-col gap-5" onSubmit={onSubmit}>
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-issue-title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-issue-title"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                {...register("title")}
              />
              <ErrorMessage>{errors.title?.message}</ErrorMessage>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="cursor-pointer">
                    <input type="radio" value={opt.value} className="peer sr-only" {...register("priority")} />
                    <span className={`peer-checked:ring-2 peer-checked:ring-offset-1 inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium transition-all hover:bg-slate-100 peer-checked:border-cyan-400 peer-checked:bg-cyan-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:peer-checked:border-cyan-500 dark:peer-checked:bg-cyan-950/30 ${opt.colour}`}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
              <ErrorMessage>{errors.priority?.message}</ErrorMessage>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Description <span className="text-rose-500">*</span>
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field: { ref: _ref, value, ...rest } }) => (
                  <SimpleMDE value={value || ""} {...rest} />
                )}
              />
              <ErrorMessage>{errors.description?.message}</ErrorMessage>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                id="update-issue-btn"
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:brightness-110 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              >
                {isPending ? (
                  <>
                    <Spinner size="2" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
              <Link
                href="/issues"
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
