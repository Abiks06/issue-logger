import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META, TYPES, TYPE_META } from "@/lib/constants";
import { PriorityIcon, StatusIcon, TypeIcon } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/bits";
import type { PickerOption } from "@/components/ui/Picker";

// Picker option lists shared by the issue form, detail sidebar, list and board.

export const statusOptions: PickerOption[] = STATUSES.map((s) => ({
  value: s,
  label: STATUS_META[s].label,
  icon: <StatusIcon status={s} />,
}));

export const priorityOptions: PickerOption[] = PRIORITIES.map((p) => ({
  value: p,
  label: PRIORITY_META[p].label,
  icon: <PriorityIcon priority={p} />,
}));

export const typeOptions: PickerOption[] = TYPES.map((t) => ({
  value: t,
  label: TYPE_META[t].label,
  icon: <TypeIcon type={t} />,
}));

export type MemberLite = { id: string; name: string; email: string };
export type LabelLite = { id: string; name: string; color: string };

export function assigneeOptions(members: MemberLite[], meId?: string): PickerOption[] {
  return [
    { value: "", label: "Unassigned", icon: <Avatar name={null} size={16} /> },
    ...members.map((m) => ({
      value: m.id,
      label: m.name,
      icon: <Avatar name={m.name} size={16} />,
      hint: m.id === meId ? "you" : undefined,
    })),
  ];
}

export function labelOptions(labels: LabelLite[]): PickerOption[] {
  return labels.map((l) => ({
    value: l.id,
    label: l.name,
    icon: <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />,
  }));
}
