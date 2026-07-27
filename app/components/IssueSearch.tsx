"use client";

import { TextField } from "@radix-ui/themes";
import { useMemo, useState } from "react";
import type { Issue } from "@prisma/client";
import IssueCard from "@/app/components/IssueCard";

interface IssueSearchProps {
  initialIssues: Issue[];
}

export default function IssueSearch({ initialIssues }: IssueSearchProps) {
  const [query, setQuery] = useState("");

  const filteredIssues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return initialIssues;
    }

    return initialIssues.filter((issue) => {
      const title = issue.title.toLowerCase();
      const description = issue.description.toLowerCase();
      return title.includes(normalizedQuery) || description.includes(normalizedQuery);
    });
  }, [initialIssues, query]);

  return (
    <>
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <TextField.Root
          placeholder="Search issues..."
          size="3"
          variant="surface"
          className="w-full"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        >
          <TextField.Slot>
            <span aria-hidden="true">🔍</span>
          </TextField.Slot>
        </TextField.Root>
      </div>

      <div className="flex flex-col gap-4">
        {filteredIssues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No issues matched your search.
          </div>
        ) : (
          filteredIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
        )}
      </div>
    </>
  );
}
