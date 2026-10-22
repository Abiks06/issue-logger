"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ChevronDown, UserPlus } from "lucide-react";
import { addMember, changeMemberRole, removeMember } from "@/actions/projects";
import { canChangeRole, canRemoveMember } from "@/lib/permissions";
import { ROLES, ROLE_META, handleFor, type Role } from "@/lib/constants";
import { Avatar } from "@/components/ui/bits";
import Picker from "@/components/ui/Picker";
import ConfirmButton from "@/components/ui/ConfirmButton";

type Member = { id: string; role: string; joinedAt: Date; user: { id: string; name: string; email: string } };

export default function MembersSettings({
  projectId,
  members,
  myRole,
  meId,
}: {
  projectId: string;
  members: Member[];
  myRole: Role;
  meId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("MEMBER");

  const invitable = ROLES.filter((r) => r !== "OWNER" && canChangeRole(myRole, "VIEWER", r));
  const canInvite = invitable.length > 0;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error ?? "Something went wrong");
      toast.success(success);
      after?.();
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      {canInvite && (
        <form
          className="card flex flex-col gap-2 p-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addMember(projectId, { email, role: inviteRole }), "Member added", () => setEmail(""));
          }}
        >
          <input
            type="email"
            className="input flex-1"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email of an existing user"
            required
          />
          <Picker
            label="Role"
            options={invitable.map((r) => ({ value: r, label: ROLE_META[r].label, hint: undefined }))}
            value={inviteRole}
            onChange={(v) => setInviteRole(v as Role)}
            triggerClassName="btn-secondary h-9"
          >
            {ROLE_META[inviteRole].label} <ChevronDown className="h-3.5 w-3.5" />
          </Picker>
          <button className="btn-primary h-9" disabled={pending || !email}>
            <UserPlus className="h-4 w-4" /> Add
          </button>
        </form>
      )}

      <ul className="card divide-y divide-line">
        {members.map((m) => {
          const role = m.role as Role;
          const isMe = m.user.id === meId;
          const roleOptions = ROLES.filter((r) => canChangeRole(myRole, role, r));
          const editable = !isMe && roleOptions.length > 0 && canChangeRole(myRole, role, role);
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <Avatar name={m.user.name} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {m.user.name} {isMe && <span className="text-faint">(you)</span>}
                </p>
                <p className="truncate text-xs text-faint">
                  {m.user.email} · <span className="font-mono">@{handleFor(m.user.email)}</span>
                </p>
              </div>
              {editable ? (
                <Picker
                  label={`Role for ${m.user.name}`}
                  align="right"
                  options={roleOptions.map((r) => ({ value: r, label: ROLE_META[r].label }))}
                  value={role}
                  onChange={(v) => v !== role && run(() => changeMemberRole(m.id, v as Role), "Role updated")}
                  triggerClassName="btn-ghost h-7 px-2 text-xs"
                >
                  {ROLE_META[role].label} <ChevronDown className="h-3 w-3" />
                </Picker>
              ) : (
                <span className="px-2 text-xs text-muted" title={ROLE_META[role].description}>{ROLE_META[role].label}</span>
              )}
              {(isMe || canRemoveMember(myRole, role)) && (
                <ConfirmButton
                  className="btn-ghost h-7 px-2 text-xs text-danger hover:text-danger"
                  title={isMe ? "Leave this project?" : `Remove ${m.user.name}?`}
                  description={isMe ? "You'll lose access until someone adds you again." : "Their assigned issues become unassigned."}
                  confirmLabel={isMe ? "Leave" : "Remove"}
                  onConfirm={async () => {
                    const res = await removeMember(m.id);
                    if (!res.ok) return void toast.error(res.error);
                    if (res.data.left) {
                      toast.success("You left the project");
                      router.push("/projects");
                    } else {
                      toast.success("Member removed");
                    }
                    router.refresh();
                  }}
                >
                  {isMe ? "Leave" : "Remove"}
                </ConfirmButton>
              )}
            </li>
          );
        })}
      </ul>
      <dl className="grid gap-x-4 gap-y-1 text-xs text-faint sm:grid-cols-2">
        {ROLES.map((r) => (
          <div key={r}><dt className="inline font-medium text-muted">{ROLE_META[r].label}:</dt> <dd className="inline">{ROLE_META[r].description}</dd></div>
        ))}
      </dl>
    </div>
  );
}
