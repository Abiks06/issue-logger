"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpDown, Search, Tag, UserRound, X } from "lucide-react";
import { filtersToQuery, hasActiveFilters, type IssueFilters, type Sort } from "@/lib/issue-filters";
import Picker from "@/components/ui/Picker";
import { assigneeOptions, labelOptions, priorityOptions, statusOptions, typeOptions, type LabelLite, type MemberLite } from "@/components/ui/options";
import { StatusIcon } from "@/components/ui/icons";

const SORT_LABELS: Record<Sort, string> = {
  updated: "Last updated",
  created: "Newest",
  priority: "Priority",
  due: "Due date",
  number: "Issue number",
};

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Filter controls for the list view; every change is reflected in the URL. */
export default function FilterBar({
  filters,
  members,
  labels,
  meId,
}: {
  filters: IssueFilters;
  members: MemberLite[];
  labels: LabelLite[];
  meId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q);

  const apply = (patch: Partial<IssueFilters>) => router.push(`${pathname}${filtersToQuery(filters, patch)}`, { scroll: false });

  const chip = (active: boolean) =>
    `btn h-8 border text-[13px] ${active ? "border-accent/50 bg-accent-soft text-fg" : "border-line bg-surface text-muted hover:text-fg"}`;

  const assigneeLabel =
    filters.assignee === "me" ? "Me" : filters.assignee === "none" ? "Unassigned" : members.find((m) => m.id === filters.assignee)?.name;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => q !== filters.q && apply({ q })}
          placeholder="Search title, text or #"
          className="input h-8 w-56 pl-8 text-[13px]"
          aria-label="Search issues"
        />
      </form>

      <Picker
        label="Status"
        multiple
        options={statusOptions}
        value={filters.status}
        onChange={(v) => apply({ status: toggle(filters.status, v as IssueFilters["status"][number]) })}
        triggerClassName={chip(filters.status.length > 0)}
      >
        <StatusIcon status={filters.status[0] ?? "TODO"} />
        Status{filters.status.length > 0 && `: ${filters.status.length}`}
      </Picker>

      <Picker
        label="Priority"
        multiple
        options={priorityOptions}
        value={filters.priority}
        onChange={(v) => apply({ priority: toggle(filters.priority, v as IssueFilters["priority"][number]) })}
        triggerClassName={chip(filters.priority.length > 0)}
      >
        Priority{filters.priority.length > 0 && `: ${filters.priority.length}`}
      </Picker>

      <Picker
        label="Type"
        multiple
        options={typeOptions}
        value={filters.type}
        onChange={(v) => apply({ type: toggle(filters.type, v as IssueFilters["type"][number]) })}
        triggerClassName={chip(filters.type.length > 0)}
      >
        Type{filters.type.length > 0 && `: ${filters.type.length}`}
      </Picker>

      <Picker
        label="Assignee"
        options={[
          { value: "me", label: "Assigned to me", icon: <UserRound className="h-3.5 w-3.5" /> },
          ...assigneeOptions(members, meId).map((o) => (o.value === "" ? { ...o, value: "none" } : o)),
        ]}
        value={filters.assignee}
        onChange={(v) => apply({ assignee: v === filters.assignee ? null : v })}
        triggerClassName={chip(Boolean(filters.assignee))}
      >
        <UserRound className="h-3.5 w-3.5" />
        {assigneeLabel ?? "Assignee"}
      </Picker>

      {labels.length > 0 && (
        <Picker
          label="Label"
          options={labelOptions(labels)}
          value={filters.label}
          onChange={(v) => apply({ label: v === filters.label ? null : v })}
          triggerClassName={chip(Boolean(filters.label))}
        >
          <Tag className="h-3.5 w-3.5" />
          {labels.find((l) => l.id === filters.label)?.name ?? "Label"}
        </Picker>
      )}

      <Picker
        label="Sort"
        options={Object.entries(SORT_LABELS).map(([value, label]) => ({ value, label }))}
        value={filters.sort}
        onChange={(v) => apply({ sort: v as Sort })}
        triggerClassName={chip(false)}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {SORT_LABELS[filters.sort]}
      </Picker>

      {hasActiveFilters(filters) && (
        <button
          className="btn-ghost h-8"
          onClick={() => {
            setQ("");
            router.push(pathname + (filters.sort !== "updated" ? `?sort=${filters.sort}` : ""));
          }}
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );
}
