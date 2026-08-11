"use client";

import dynamic from "next/dynamic";
import { Callout, Spinner } from "@radix-ui/themes";
import "easymde/dist/easymde.min.css";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createIssueSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import { createIssue } from "@/actions/issue";
import ErrorMessage from "@/components/ErrorMessage";
import Link from "next/link";
import toast from "react-hot-toast";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-56 w-full animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
  ),
});

type IssueForm = z.infer<typeof createIssueSchema>;

const PRIORITY_OPTIONS: { value: IssueForm["priority"]; label: string; colour: string }[] = [
  { value: "LOW", label: "Low", colour: "text-sky-700 dark:text-sky-400" },
  { value: "MEDIUM", label: "Medium", colour: "text-amber-700 dark:text-amber-400" },
  { value: "HIGH", label: "High", colour: "text-orange-700 dark:text-orange-400" },
  { value: "CRITICAL", label: "Critical", colour: "text-rose-700 dark:text-rose-400" },
];

const NewIssuePage = () => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<IssueForm>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: { priority: "MEDIUM" },
  });
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      setError("");
      try {
        const result = await createIssue(data);
        if (!result.success) {
          const message = result.errors
            ? Object.values(result.errors).flat().join(" ")
            : result.error || "Failed to create issue.";
          setError(message);
          return;
        }
        toast.success("Issue created!");
        router.push("/issues");
      } catch {
        setError("An unexpected error occurred.");
      }
    });
  });

  return (
    <div className="min-h-screen px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-200">Dashboard</Link>
          <span>›</span>
          <Link href="/issues" className="hover:text-slate-700 dark:hover:text-slate-200">Issues</Link>
          <span>›</span>
          <span className="text-slate-700 dark:text-slate-200">New Issue</span>
        </nav>

        <div className="card-shadow-lg rounded-2xl border border-slate-200 bg-white p-4.5 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          {/* Heading */}
          <div className="mb-5 sm:mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400 sm:text-xs">
              New Issue
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Report an issue
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Fill in the details below to log a new issue for the team.
            </p>
          </div>

          {error && (
            <Callout.Root variant="surface" size="2" color="red" highContrast className="mb-5 w-full">
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <form className="flex w-full flex-col gap-4 sm:gap-5" onSubmit={onSubmit}>
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="issue-title" className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="issue-title"
                placeholder="Describe the issue in one line…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 sm:px-4 sm:py-2.5 sm:text-sm"
                {...register("title")}
              />
              <ErrorMessage>{errors.title?.message}</ErrorMessage>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {PRIORITY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="cursor-pointer">
                    <input
                      type="radio"
                      value={opt.value}
                      className="peer sr-only"
                      {...register("priority")}
                    />
                    <span className={`peer-checked:ring-2 peer-checked:ring-offset-1 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium transition-all hover:bg-slate-100 peer-checked:border-cyan-400 peer-checked:bg-cyan-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:peer-checked:border-cyan-500 dark:peer-checked:bg-cyan-950/30 sm:px-4 sm:text-sm ${opt.colour}`}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
              <ErrorMessage>{errors.priority?.message}</ErrorMessage>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
                Description <span className="text-rose-500">*</span>
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field: { value, onChange, onBlur, name } }) => (
                  <SimpleMDE
                    placeholder="Describe the issue in detail. Markdown is supported."
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    id={name}
                  />
                )}
              />
              <ErrorMessage>{errors.description?.message}</ErrorMessage>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-3">
              <button
                id="submit-issue-btn"
                type="submit"
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:brightness-110 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:w-auto cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Spinner size="2" />
                    Creating…
                  </>
                ) : (
                  "Create Issue"
                )}
              </button>
              <Link
                href="/issues"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:w-auto text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewIssuePage;
