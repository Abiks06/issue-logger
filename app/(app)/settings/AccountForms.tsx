"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { changePassword, signOutOtherSessions, updateProfile } from "@/actions/auth";
import { Field, firstErrors } from "@/components/ui/Field";

export default function AccountForms({ name: initialName, remembered }: { name: string; remembered: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <div className="flex flex-col gap-6">
      <form
        className="card flex flex-col gap-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await updateProfile({ name });
            if (!res.ok) return void toast.error(res.error);
            toast.success("Profile updated");
            router.refresh();
          });
        }}
      >
        <h2 className="text-sm font-semibold">Profile</h2>
        <Field id="name" label="Display name">
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={pending || name.trim() === initialName || !name.trim()}>Save</button>
        </div>
      </form>

      <form
        className="card flex flex-col gap-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const values = Object.fromEntries(new FormData(form));
          startTransition(async () => {
            const res = await changePassword(values);
            if (!res.ok) {
              setErrors(firstErrors(res.fieldErrors));
              return void toast.error(res.error);
            }
            setErrors({});
            form.reset();
            toast.success("Password changed. Other devices were signed out.");
          });
        }}
      >
        <h2 className="text-sm font-semibold">Change password</h2>
        <Field id="currentPassword" label="Current password" error={errors.currentPassword}>
          <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className="input" />
        </Field>
        <Field id="password" label="New password" error={errors.password}>
          <input id="password" name="password" type="password" autoComplete="new-password" className="input" />
        </Field>
        <Field id="confirmPassword" label="Confirm new password" error={errors.confirmPassword}>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" className="input" />
        </Field>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={pending}>Update password</button>
        </div>
      </form>

      <form
        className="card flex flex-col gap-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const password = String(new FormData(form).get("sessionPassword") ?? "");
          startTransition(async () => {
            const res = await signOutOtherSessions({ password });
            if (!res.ok) return void toast.error(res.error);
            form.reset();
            toast.success("Signed out everywhere else");
          });
        }}
      >
        <div>
          <h2 className="text-sm font-semibold">Sessions</h2>
          <p className="mt-1 text-[13px] text-muted">
            {remembered
              ? "This browser stays signed in for 30 days after your last visit."
              : "This browser signs out after 12 hours of inactivity."}{" "}
            Lost a device or signed in somewhere public? Sign out everywhere else.
          </p>
        </div>
        <Field id="sessionPassword" label="Confirm with your password">
          <input id="sessionPassword" name="sessionPassword" type="password" autoComplete="current-password" className="input" required />
        </Field>
        <div className="flex justify-end">
          <button className="btn-secondary" disabled={pending}>Sign out other devices</button>
        </div>
      </form>
    </div>
  );
}
