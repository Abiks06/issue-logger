"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Download } from "lucide-react";
import { deleteAccount, updateEmailPrefs } from "@/actions/auth";
import { EMAIL_TYPES, type EmailPrefs, type EmailType } from "@/lib/email-prefs";
import { Field } from "@/components/ui/Field";

export function EmailPrefsForm({ initial, mailEnabled }: { initial: EmailPrefs; mailEnabled: boolean }) {
  const [prefs, setPrefs] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = EMAIL_TYPES.some((t) => prefs[t.type] !== saved[t.type]);

  return (
    <form
      id="email"
      className="card flex scroll-mt-20 flex-col gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updateEmailPrefs(prefs);
          if (!res.ok) return void toast.error(res.error);
          setSaved(prefs);
          toast.success("Email preferences saved");
        });
      }}
    >
      <div>
        <h2 className="text-sm font-semibold">Email notifications</h2>
        <p className="mt-1 text-[13px] text-muted">Everything still appears in your Inbox; these choose what is also emailed.</p>
        {!mailEnabled && <p className="mt-1 text-xs text-faint">Email isn&apos;t configured on this server, so nothing will be sent yet.</p>}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Email me when</legend>
        {EMAIL_TYPES.map((t) => (
          <label key={t.type} className="flex items-center gap-2.5 text-[13px]">
            <input
              type="checkbox"
              className="accent-[var(--accent)]"
              checked={prefs[t.type as EmailType]}
              onChange={(e) => setPrefs((p) => ({ ...p, [t.type]: e.target.checked }))}
            />
            {t.label}
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end">
        <button className="btn-primary" disabled={pending || !dirty}>{pending ? "Saving…" : "Save preferences"}</button>
      </div>
    </form>
  );
}

export function DataAndDeletion() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-sm font-semibold">Your data</h2>
          <p className="mt-1 text-[13px] text-muted">Download your profile, projects, issues and comments as JSON.</p>
        </div>
        <a href="/api/account/export" className="btn-secondary" download>
          <Download className="h-3.5 w-3.5" /> Export my data
        </a>
      </div>

      <form
        className="flex flex-col gap-4 rounded-lg border border-danger/30 bg-danger-soft p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setError("");
          startTransition(async () => {
            const res = await deleteAccount({ password: form.get("deletePassword"), confirm: form.get("confirm") });
            // Success redirects to the login page, so only failures land here.
            if (res && !res.ok) setError(res.fieldErrors?.confirm ? "Type DELETE to confirm." : res.error);
          });
        }}
      >
        <div>
          <h2 className="text-sm font-semibold text-danger">Delete account</h2>
          <p className="mt-1 text-[13px] text-fg">
            Permanently deletes your account and any project where you&apos;re the only member. Issues and comments you wrote in shared
            projects stay, shown as from a deleted user. If you&apos;re the only owner of a shared project, make someone else an owner first.
          </p>
        </div>
        {error && <p className="text-[13px] font-medium text-danger" role="alert">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="deletePassword" label="Your password">
            <input id="deletePassword" name="deletePassword" type="password" autoComplete="current-password" className="input" required />
          </Field>
          <Field id="confirm" label="Type DELETE to confirm">
            <input id="confirm" name="confirm" className="input font-mono" autoComplete="off" required />
          </Field>
        </div>
        <div className="flex justify-end">
          <button className="btn-danger" disabled={pending}>{pending ? "Deleting…" : "Delete my account"}</button>
        </div>
      </form>
    </div>
  );
}
