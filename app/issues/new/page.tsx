"use client";

import dynamic from "next/dynamic";
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
import { motion } from "framer-motion";
import Spinner from "@/components/SpinnerAnim";
import { AlertCircle, ArrowDown, Diamond, ArrowUp, ChevronsUp } from "lucide-react";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-56 w-full animate-pulse rounded-xl border border-slate-200/80 bg-slate-100/60 dark:border-slate-700/80 dark:bg-slate-800/60" />
  ),
});

type IssueForm = z.infer<typeof createIssueSchema>;

const PRIORITY_OPTIONS: { value: IssueForm["priority"]; label: string; colour: string; icon: React.ReactNode }[] = [
  { value: "LOW", label: "Low", colour: "text-sky-600 dark:text-sky-400", icon: <ArrowDown className="h-3.5 w-3.5" /> },
  { value: "MEDIUM", label: "Medium", colour: "text-amber-600 dark:text-amber-400", icon: <Diamond className="h-3.5 w-3.5" /> },
  { value: "HIGH", label: "High", colour: "text-orange-600 dark:text-orange-400", icon: <ArrowUp className="h-3.5 w-3.5" /> },
  { value: "CRITICAL", label: "Critical", colour: "text-rose-600 dark:text-rose-400", icon: <ChevronsUp className="h-3.5 w-3.5" /> },
];

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

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
    <motion.div
      className="min-h-screen px-3 py-5 sm:px-6 sm:py-8 lg:px-8"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto w-full max-w-2xl">
        {/* Breadcrumb */}
        <motion.nav variants={item} className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Dashboard</Link>
          <span className="text-slate-300 dark:text-slate-600">›</span>
          <Link href="/issues" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Issues</Link>
          <span className="text-slate-300 dark:text-slate-600">›</span>
          <span className="text-slate-700 dark:text-slate-200">New Issue</span>
        </motion.nav>

        <motion.div variants={item} className="glass-card rounded-2xl p-4.5 sm:p-8">
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
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form className="flex w-full flex-col gap-4 sm:gap-5" onSubmit={onSubmit}>
            {/* Title */}
            <motion.div variants={item} className="flex flex-col gap-1.5">
              <label htmlFor="issue-title" className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="issue-title"
                placeholder="Describe the issue in one line…"
                className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus-ring dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 sm:px-4 sm:py-2.5 sm:text-sm"
                {...register("title")}
              />
              <ErrorMessage>{errors.title?.message}</ErrorMessage>
            </motion.div>

            {/* Priority */}
            <motion.div variants={item} className="flex flex-col gap-1.5">
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
                    <span className={`peer-checked:ring-2 peer-checked:ring-cyan-400/50 peer-checked:ring-offset-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-medium transition-all hover:bg-slate-50 peer-checked:border-cyan-400 peer-checked:bg-cyan-50 dark:border-slate-700/80 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:peer-checked:border-cyan-500 dark:peer-checked:bg-cyan-950/30 sm:px-4 sm:text-sm ${opt.colour}`}>
                      {opt.icon}
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
              <ErrorMessage>{errors.priority?.message}</ErrorMessage>
            </motion.div>

            {/* Description */}
            <motion.div variants={item} className="flex flex-col gap-1.5">
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
            </motion.div>

            {/* Actions */}
            <motion.div variants={item} className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-3">
              <motion.button
                id="submit-issue-btn"
                type="submit"
                disabled={isPending}
                className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-md shadow-cyan-500/20 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:w-auto cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isPending ? (
                  <>
                    <Spinner size="sm" />
                    Creating…
                  </>
                ) : (
                  "Create Issue"
                )}
              </motion.button>
              <Link
                href="/issues"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200/80 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 sm:w-auto text-center"
              >
                Cancel
              </Link>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default NewIssuePage;
