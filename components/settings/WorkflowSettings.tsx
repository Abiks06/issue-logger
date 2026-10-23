"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateWorkflow } from "@/actions/projects";
import { PRIORITIES, PRIORITY_META, STATUS_META, type Priority, type Status } from "@/lib/constants";
import { formatDuration, type SlaTargets } from "@/lib/sla";
import { PriorityIcon, StatusIcon } from "@/components/ui/icons";

const WIP_COLUMNS: Status[] = ["TODO", "IN_PROGRESS", "IN_REVIEW"];

/** Hours as typed ("" = no target). */
type Row = { respond: string; resolve: string };

const toHours = (minutes: number | null | undefined) => (minutes ? String(Math.round((minutes / 60) * 100) / 100) : "");
const parse = (v: string) => (v.trim() === "" ? null : Number(v));

export default function WorkflowSettings({
  projectId,
  targets,
  wipLimits,
}: {
  projectId: string;
  targets: SlaTargets;
  wipLimits: Partial<Record<Status, number>>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Record<Priority, Row>>(
    () => Object.fromEntries(PRIORITIES.map((p) => [p, { respond: toHours(targets[p]?.respond), resolve: toHours(targets[p]?.resolve) }])) as Record<Priority, Row>,
  );
  const [wip, setWip] = useState<Record<string, string>>(() => Object.fromEntries(WIP_COLUMNS.map((s) => [s, wipLimits[s] ? String(wipLimits[s]) : ""])));

  const invalid = PRIORITIES.some((p) => {
    const { respond, resolve } = rows[p];
    const r = parse(respond);
    const s = parse(resolve);
    return (r !== null && !(r >= 0.25)) || (s !== null && !(s >= 0.25)) || (r !== null && s !== null && r > s);
  });

  const save = () =>
    startTransition(async () => {
      const res = await updateWorkflow(projectId, {
        sla: PRIORITIES.map((priority) => ({ priority, respondHours: parse(rows[priority].respond), resolveHours: parse(rows[priority].resolve) })),
        wip: Object.fromEntries(WIP_COLUMNS.map((s) => [s, wip[s] ? Number(wip[s]) : null])),
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Workflow saved");
      router.refresh();
    });

  const hoursInput = (p: Priority, field: keyof Row) => {
    const value = rows[p][field];
    const n = parse(value);
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0.25}
          step={0.25}
          inputMode="decimal"
          placeholder="—"
          value={value}
          onChange={(e) => setRows((r) => ({ ...r, [p]: { ...r[p], [field]: e.target.value } }))}
          className="input h-8 w-20 text-[13px]"
          aria-label={`${PRIORITY_META[p].label} ${field === "respond" ? "response" : "resolution"} target in hours`}
        />
        <span className="w-10 text-xs text-faint">{n && n >= 0.25 ? formatDuration(n * 3_600_000) : "h"}</span>
      </div>
    );
  };

  return (
    <div className="card flex flex-col gap-5 p-4">
      <div>
        <h3 className="text-[13px] font-semibold">SLA targets</h3>
        <p className="mt-0.5 text-xs text-muted">
          Hours from creation. <b className="font-medium">Response</b> stops when work starts or someone other than the reporter comments;{" "}
          <b className="font-medium">resolution</b> stops when the issue is done. Leave blank for no target.
        </p>
        <table className="mt-3 w-full text-left text-[13px]">
          <thead className="text-xs text-faint">
            <tr><th className="pb-1.5 font-medium">Priority</th><th className="pb-1.5 font-medium">Respond within</th><th className="pb-1.5 font-medium">Resolve within</th></tr>
          </thead>
          <tbody>
            {PRIORITIES.map((p) => (
              <tr key={p} className="border-t border-line">
                <td className="py-1.5"><span className="inline-flex items-center gap-1.5"><PriorityIcon priority={p} />{PRIORITY_META[p].label}</span></td>
                <td className="py-1.5">{hoursInput(p, "respond")}</td>
                <td className="py-1.5">{hoursInput(p, "resolve")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {invalid && <p className="field-error">Targets must be at least 15 minutes, and response can&apos;t exceed resolution.</p>}
      </div>

      <div className="border-t border-line pt-4">
        <h3 className="text-[13px] font-semibold">Board WIP limits</h3>
        <p className="mt-0.5 text-xs text-muted">A column turns red when it holds more issues than its limit. Moves are still allowed, with a warning.</p>
        <div className="mt-3 flex flex-wrap gap-4">
          {WIP_COLUMNS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-[13px]">
              <StatusIcon status={s} />
              <span className="w-20">{STATUS_META[s].label}</span>
              <input
                type="number"
                min={1}
                max={999}
                placeholder="No limit"
                value={wip[s]}
                onChange={(e) => setWip((w) => ({ ...w, [s]: e.target.value }))}
                className="input h-8 w-24 text-[13px]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end border-t border-line pt-4">
        <button className="btn-primary" onClick={save} disabled={pending || invalid}>{pending ? "Saving…" : "Save workflow"}</button>
      </div>
    </div>
  );
}
