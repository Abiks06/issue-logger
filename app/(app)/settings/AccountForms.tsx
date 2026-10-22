"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { changePassword, updateProfile } from "@/actions/auth";
import { Field, firstErrors } from "@/components/ui/Field";

export default function AccountForms({ name: initialName }: { name: string }) {
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
            toast.success("Password changed");
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
    </div>
  );
}
