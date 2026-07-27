import { Box, Button, Flex } from "@radix-ui/themes";
import type { Issue } from "@prisma/client";
import { deleteIssue, updateIssueStatus } from "@/app/actions/issue";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface IssueCardProps {
  issue: Issue;
}

function IssueCard({ issue }: IssueCardProps) {
  const isInProgress = issue.status === "IN_PROGRESS";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <Flex gap="3" direction="column">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {issue.title}
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {issue.status.replace("_", " ")}
          </span>
        </div>

        <Box
          style={{
            background: "var(--gray-a2)",
            borderRadius: "var(--radius-3)",
            boxShadow: "var(--shadow-1)",
            padding: "1rem",
          }}
        >
          <div className="prose prose-slate max-w-none text-sm leading-6 text-slate-700 dark:prose-invert dark:text-slate-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{issue.description}</ReactMarkdown>
          </div>
        </Box>

        <div className="flex items-center justify-end">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Created {new Date(issue.createdAt).toLocaleDateString()}
          </span>
        </div>

        <Flex gap="3">
          <form action={updateIssueStatus.bind(null, issue.id, "IN_PROGRESS")}>
            <Button
              size="2"
              color="cyan"
              variant="outline"
              type="submit"
              disabled={isInProgress}
            >
              {isInProgress ? "In Progress" : "Mark In Progress"}
            </Button>
          </form>

          <form action={deleteIssue.bind(null, issue.id)}>
            <Button size="2" color="crimson" variant="outline" type="submit">
              Delete
            </Button>
          </form>
        </Flex>
      </Flex>
    </div>
  );
}

export default IssueCard;
