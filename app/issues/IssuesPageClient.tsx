"use client";

import Link from "next/link";
import type { Issue } from "@prisma/client";
import { motion } from "framer-motion";
import IssueSearch from "@/components/IssueSearch";
import { Plus } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface IssuesPageClientProps {
  issues: Issue[];
}

export default function IssuesPageClient({ issues }: IssuesPageClientProps) {
  return (
    <motion.div
      className="min-h-screen px-3 py-5 sm:px-6 sm:py-8 lg:px-8"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-5">
        {/* Page header */}
        <motion.div
          variants={item}
          className="glass-card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400 sm:text-xs">
              Activity Board
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              All Issues
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              {issues.length} total issue{issues.length !== 1 ? "s" : ""}
            </p>
          </div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/issues/new"
              id="new-issue-btn"
              className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md shadow-cyan-500/20 sm:w-fit focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New Issue
            </Link>
          </motion.div>
        </motion.div>

        <motion.div variants={item}>
          <div className="flex flex-col gap-4 sm:gap-5">
            <IssueSearch initialIssues={issues} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
