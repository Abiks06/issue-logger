"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Copy, GitBranch, Repeat, Trash2 } from "lucide-react";
import { deleteIssues, updateIssue } from "@/actions/issues";
import type { IssuePatch } from "@/lib/validation";
import { PRIORITY_META, STATUS_META, TYPE_META, type IssueKind, type Priority, type Status } from "@/lib/constants";
import { isOverdue } from "@/lib/analytics";
import Picker from "@/components/ui/Picker";
import ParentPicker from "@/components/issues/ParentPicker";
import { SlaClockRow } from "@/components/issues/SlaBadge";
import type { SlaStatus } from "@/lib/sla";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Avatar, LabelChip, TimeAgo } from "@/components/ui/bits";
import { PriorityIcon, StatusIcon, TypeIcon } from "@/components/ui/icons";
import {
  assigneeOptions, labelOptions, priorityOptions, statusOptions, typeOptions, type LabelLite, type MemberLite,
} from "@/components/ui/options";

type IssueProps = {
  id: string;
  status: string;
  priority: string;
  type: string;
  assigneeId: string | null;
  labelIds: string[];
  dueDate: Date | null;
  estimate: number | null;
  reporter: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  source: string;
  occurrences: number;
  lastSeenAt: Date | null;
  environment: string | null;
  number: number;
  title: string;
  parent: { id: string; number: number; title: string; status: string } | null;
  childCount: number;
};

type Props = {
  projectId: string;
  projectKey: string;
  issue: IssueProps;
  members: MemberLite[];
  labels: LabelLite[];
  meId: string;
  canEdit: boolean;
  canDelete: boolean;
  sla: SlaStatus;
};

const trigger = "btn-ghost h-8 w-full justify-start px-2 text-[13px] text-fg disabled:opacity-100";

export default function IssueProperties({ projectId, projectKey, issue: initial, members, labels, meId, canEdit, canDelete, sla }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [issue, setIssue] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setIssue(initial);
  }

  /** Optimistic single-field update; rolls back on failure. */
  const patch = (local: Partial<IssueProps>, server: IssuePatch) => {
    const snapshot = issue;
    setIssue((i) => ({ ...i, ...local }));
    startTransition(async () => {
      const res = await updateIssue(issue.id, server);
      if (!res.ok) {
        setIssue(snapshot);
        toast.error(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const assignee = members.find((m) => m.id === issue.assigneeId);
  const issueLabels = labels.filter((l) => issue.labelIds.includes(l.id));
  const closed = issue.status === "DONE" || issue.status === "CANCELED";
  const overdue = !closed && isOverdue({ dueDate: issue.dueDate, closedAt: null });

  return (
    <aside className="w-full shrink-0 lg:w-72" aria-label="Issue properties">
      <div className="card flex flex-col gap-0.5 p-2 lg:sticky lg:top-16">
        <Row label="Status">
          <Picker label="Status" options={statusOptions} value={issue.status} disabled={!canEdit} triggerClassName={trigger}
            onChange={(v) => patch({ status: v }, { status: v as Status })}>
            <StatusIcon status={issue.status as Status} /> {STATUS_META[issue.status as Status].label}
          </Picker>
        </Row>
        <Row label="Priority">
          <Picker label="Priority" options={priorityOptions} value={issue.priority} disabled={!canEdit} triggerClassName={trigger}
            onChange={(v) => patch({ priority: v }, { priority: v as Priority })}>
            <PriorityIcon priority={issue.priority as Priority} /> {PRIORITY_META[issue.priority as Priority].label}
          </Picker>
        </Row>
        <Row label="Type">
          <Picker label="Type" options={typeOptions} value={issue.type} disabled={!canEdit} triggerClassName={trigger}
            onChange={(v) => patch({ type: v }, { type: v as IssueKind })}>
            <TypeIcon type={issue.type as IssueKind} /> {TYPE_META[issue.type as IssueKind].label}
          </Picker>
        </Row>
        <Row label="Assignee">
          <Picker label="Assignee" options={assigneeOptions(members, meId)} value={issue.assigneeId ?? ""} disabled={!canEdit} triggerClassName={trigger}
            onChange={(v) => patch({ assigneeId: v || null }, { assigneeId: v || null })}>
            <Avatar name={assignee?.name} size={18} /> {assignee?.name ?? <span className="text-faint">Unassigned</span>}
          </Picker>
        </Row>
        {canEdit && !assignee && (
          <button className="ml-[88px] w-fit text-xs text-accent hover:underline" onClick={() => patch({ assigneeId: meId }, { assigneeId: meId })}>
            Assign to me
          </button>
        )}
        <Row label="Labels">
          <Picker label="Labels" multiple options={labelOptions(labels)} value={issue.labelIds} disabled={!canEdit} triggerClassName={`${trigger} h-auto min-h-8 flex-wrap py-1`}
            onChange={(v) => {
              const next = issue.labelIds.includes(v) ? issue.labelIds.filter((x) => x !== v) : [...issue.labelIds, v];
              patch({ labelIds: next }, { labelIds: next });
            }}>
            {issueLabels.length ? issueLabels.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />) : <span className="text-faint">No labels</span>}
          </Picker>
        </Row>
        <Row label="Parent">
          <ParentPicker
            projectId={projectId}
            projectKey={projectKey}
            issueId={issue.id}
            parent={issue.parent}
            disabled={!canEdit}
            triggerClassName={trigger}
            onChange={(parent) => patch({ parent }, { parentId: parent?.id ?? null })}
          />
        </Row>
        <Row label="Due date">
          <input
            type="date"
            disabled={!canEdit}
            value={issue.dueDate ? issue.dueDate.toISOString().slice(0, 10) : ""}
            onChange={(e) => {
              const v = e.target.value;
              patch({ dueDate: v ? new Date(`${v}T00:00:00Z`) : null }, { dueDate: v || null });
            }}
            className={`h-8 w-full rounded-md bg-transparent px-2 text-[13px] outline-none hover:bg-surface-2 focus:bg-surface-2 ${overdue ? "font-medium text-danger" : "text-fg"}`}
            aria-label="Due date"
          />
        </Row>
        <Row label="Estimate">
          <input
            type="number" min={0} max={100} disabled={!canEdit} placeholder="—"
            defaultValue={issue.estimate ?? ""}
            key={issue.estimate ?? "none"}
            onBlur={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              if (v !== issue.estimate) patch({ estimate: v }, { estimate: v });
            }}
            className="h-8 w-full rounded-md bg-transparent px-2 text-[13px] text-fg outline-none placeholder:text-faint hover:bg-surface-2 focus:bg-surface-2"
            aria-label="Estimate in points"
          />
        </Row>

        {(sla.respond || sla.resolve) && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-line px-2 pt-3" aria-label="Service level">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">SLA</p>
            <SlaClockRow label="Response" clock={sla.respond} />
            <SlaClockRow label="Resolution" clock={sla.resolve} />
          </div>
        )}

        <dl className="mt-2 flex flex-col gap-1.5 border-t border-line px-2 pt-3 text-xs">
          <Meta label="Reporter">{issue.reporter ?? (issue.source === "API" ? "API" : "—")}</Meta>
          <Meta label="Created"><TimeAgo date={issue.createdAt} /></Meta>
          <Meta label="Updated"><TimeAgo date={issue.updatedAt} /></Meta>
          {issue.closedAt && <Meta label="Closed"><TimeAgo date={issue.closedAt} /></Meta>}
          {issue.source === "API" && (
            <>
              <Meta label="Occurrences">
                <span className="inline-flex items-center gap-1 font-medium text-danger"><Repeat className="h-3 w-3" />{issue.occurrences}</span>
              </Meta>
              {issue.lastSeenAt && <Meta label="Last seen"><TimeAgo date={issue.lastSeenAt} /></Meta>}
              {issue.environment && <Meta label="Environment"><span className="chip h-5">{issue.environment}</span></Meta>}
            </>
          )}
        </dl>

        <div className="mt-3 flex gap-1 border-t border-line pt-2">
          <button
            className="btn-ghost h-7 flex-1 text-xs"
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Link
          </button>
          <button
            className="btn-ghost h-7 flex-1 text-xs"
            title="Copy a git branch name for this issue"
            onClick={async () => {
              await navigator.clipboard.writeText(branchName(projectKey, issue.number, issue.title));
              toast.success("Branch name copied");
            }}
          >
            <GitBranch className="h-3.5 w-3.5" /> Branch
          </button>
          {canDelete && (
            <ConfirmButton
              className="btn-ghost h-7 flex-1 text-xs text-danger hover:text-danger"
              title="Delete this issue?"
              description="Its comments and history go with it. This can't be undone."
              onConfirm={async () => {
                const res = await deleteIssues(projectId, [issue.id]);
                if (!res.ok) return void toast.error(res.error);
                toast.success("Issue deleted");
                router.push(`/projects/${projectKey}/issues`);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </ConfirmButton>
          )}
        </div>
      </div>
    </aside>
  );
}

/** "web-12-login-form-loses-focus", kept short enough for terminals. */
function branchName(projectKey: string, number: number, title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40).replace(/-$/, "");
  return `${projectKey.toLowerCase()}-${number}${slug ? `-${slug}` : ""}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 px-2 text-xs text-faint">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-faint">{label}</dt>
      <dd className="text-muted">{children}</dd>
    </div>
  );
}
