"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CalendarDays, Gauge, Tag } from "lucide-react";
import { createIssue } from "@/actions/issues";
import { issueSchema } from "@/lib/validation";
import { PRIORITY_META, STATUS_META, TYPE_META, type IssueKind, type Priority, type Status } from "@/lib/constants";
import Picker from "@/components/ui/Picker";
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import { Avatar, LabelChip } from "@/components/ui/bits";
import { PriorityIcon, StatusIcon, TypeIcon } from "@/components/ui/icons";
import { FormAlert, firstErrors } from "@/components/ui/Field";
import {
  assigneeOptions, labelOptions, priorityOptions, statusOptions, typeOptions, type LabelLite, type MemberLite,
} from "@/components/ui/options";

const TEMPLATES: Record<IssueKind, string> = {
  BUG: "## What happened\n\n\n## Steps to reproduce\n1. \n\n## Expected\n\n",
  FEATURE: "## Problem\n\n\n## Proposal\n\n",
  TASK: "",
  INCIDENT: "## Impact\n\n\n## Timeline\n- \n\n## Mitigation\n\n",
};

type Props = {
  projectId: string;
  projectKey: string;
  members: MemberLite[];
  labels: LabelLite[];
  meId: string;
  initialStatus: Status;
};

export default function IssueForm({ projectId, projectKey, members, labels, meId, initialStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>(initialStatus);
  const [priority, setPriority] = useState<Priority>("NONE");
  const [type, setType] = useState<IssueKind>("TASK");
  const [assigneeId, setAssigneeId] = useState("");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [estimate, setEstimate] = useState("");
  const [createMore, setCreateMore] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const pickType = (t: IssueKind) => {
    // Only swap in a template when the description is empty or still the previous template.
    if (!description.trim() || description === TEMPLATES[type]) setDescription(TEMPLATES[t]);
    setType(t);
  };

  const submit = () => {
    const input = {
      title,
      description: description === TEMPLATES[type] ? "" : description,
      status,
      priority,
      type,
      assigneeId,
      labelIds,
      dueDate: dueDate || null,
      estimate: estimate === "" ? null : Number(estimate),
    };
    const parsed = issueSchema.safeParse(input);
    setError("");
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await createIssue(projectId, input);
      if (!res.ok) {
        setError(res.error);
        setErrors(firstErrors(res.fieldErrors));
        return;
      }
      toast.success(`Created ${res.data.key}`);
      if (createMore) {
        setTitle("");
        setDescription(TEMPLATES[type]);
        router.refresh();
      } else {
        router.push(`/projects/${projectKey}/issues/${res.data.number}`);
      }
    });
  };

  const assignee = members.find((m) => m.id === assigneeId);
  const selectedLabels = labels.filter((l) => labelIds.includes(l.id));

  return (
    <form
      className="card animate-fade-up overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-xs text-faint">
        <span className="font-mono">{projectKey}</span> › New issue
      </div>

      <div className="flex flex-col gap-3 p-4">
        {error && <FormAlert>{error}</FormAlert>}
        <div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            aria-label="Title"
            aria-invalid={Boolean(errors.title)}
            autoFocus
            className="w-full bg-transparent text-lg font-semibold text-fg outline-none placeholder:text-faint"
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>
        <MarkdownEditor
          value={description}
          onChange={setDescription}
          placeholder="Add a description… (Markdown, ⌘/Ctrl+Enter to create)"
          rows={10}
          onSubmit={submit}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <Picker label="Status" options={statusOptions} value={status} onChange={(v) => setStatus(v as Status)} triggerClassName="btn-secondary h-7 px-2 text-xs">
            <StatusIcon status={status} /> {STATUS_META[status].label}
          </Picker>
          <Picker label="Priority" options={priorityOptions} value={priority} onChange={(v) => setPriority(v as Priority)} triggerClassName="btn-secondary h-7 px-2 text-xs">
            <PriorityIcon priority={priority} /> {PRIORITY_META[priority].label}
          </Picker>
          <Picker label="Type" options={typeOptions} value={type} onChange={(v) => pickType(v as IssueKind)} triggerClassName="btn-secondary h-7 px-2 text-xs">
            <TypeIcon type={type} /> {TYPE_META[type].label}
          </Picker>
          <Picker label="Assignee" options={assigneeOptions(members, meId)} value={assigneeId} onChange={setAssigneeId} triggerClassName="btn-secondary h-7 px-2 text-xs">
            <Avatar name={assignee?.name} size={16} /> {assignee?.name ?? "Assignee"}
          </Picker>
          {labels.length > 0 && (
            <Picker
              label="Labels"
              multiple
              options={labelOptions(labels)}
              value={labelIds}
              onChange={(v) => setLabelIds((ids) => (ids.includes(v) ? ids.filter((x) => x !== v) : [...ids, v]))}
              triggerClassName="btn-secondary h-7 px-2 text-xs"
            >
              <Tag className="h-3.5 w-3.5" />
              {selectedLabels.length ? `${selectedLabels.length} label${selectedLabels.length > 1 ? "s" : ""}` : "Labels"}
            </Picker>
          )}
          <label className="btn-secondary h-7 cursor-text px-2 text-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="sr-only">Due date</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-transparent text-xs outline-none [color-scheme:inherit]" />
          </label>
          <label className="btn-secondary h-7 cursor-text px-2 text-xs">
            <Gauge className="h-3.5 w-3.5" />
            <span className="sr-only">Estimate (points)</span>
            <input
              type="number" min={0} max={100} value={estimate} placeholder="Points"
              onChange={(e) => setEstimate(e.target.value)}
              className="w-14 bg-transparent text-xs outline-none placeholder:text-faint"
            />
          </label>
        </div>
        {selectedLabels.length > 0 && (
          <div className="flex flex-wrap gap-1">{selectedLabels.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />)}</div>
        )}
        {(errors.dueDate || errors.estimate) && <p className="field-error">{errors.dueDate || errors.estimate}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-line bg-surface-2/40 px-4 py-3">
        <label className="mr-auto flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={createMore} onChange={(e) => setCreateMore(e.target.checked)} className="accent-[var(--accent)]" />
          Create another
        </label>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Creating…" : "Create issue"}</button>
      </div>
    </form>
  );
}
