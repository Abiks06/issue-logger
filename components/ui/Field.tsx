// Label + control + error message, wired together for screen readers.

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="label">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Props that link an input to its Field error. */
export function describedBy(id: string, error?: string) {
  return error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};
}

/** First message per field from a Zod flatten() result. */
export function firstErrors(fieldErrors: Record<string, string[] | undefined> | undefined) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fieldErrors ?? {})) if (v?.[0]) out[k] = v[0];
  return out;
}

export function FormAlert({ children, tone = "danger" }: { children: React.ReactNode; tone?: "danger" | "success" }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2 text-[13px] ${
        tone === "danger"
          ? "border-danger/30 bg-danger-soft text-danger"
          : "border-success/30 bg-success/10 text-success"
      }`}
    >
      {children}
    </div>
  );
}
