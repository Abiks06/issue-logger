// Which notification types each person receives by email. Stored sparsely in
// User.emailPrefs; anything not set falls back to these defaults, so new
// notification types get a sensible default without a migration.

export const EMAIL_TYPES = [
  { type: "ASSIGNED", label: "An issue is assigned to me", default: true },
  { type: "MENTIONED", label: "Someone @mentions me", default: true },
  { type: "COMMENTED", label: "New comments on issues I reported or own", default: false },
  { type: "STATUS_CHANGED", label: "Status changes on issues I reported or own", default: false },
  { type: "REGRESSED", label: "An error I own comes back after being fixed", default: true },
  { type: "SLA_AT_RISK", label: "An SLA on my issue is at risk", default: false },
  { type: "SLA_BREACHED", label: "An SLA on my issue is breached", default: true },
] as const;

export type EmailType = (typeof EMAIL_TYPES)[number]["type"];
export type EmailPrefs = Record<EmailType, boolean>;

/** Full preference map from the stored (possibly partial or malformed) JSON. */
export function resolveEmailPrefs(stored: unknown): EmailPrefs {
  const raw = stored && typeof stored === "object" && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
  return Object.fromEntries(
    EMAIL_TYPES.map((t) => [t.type, typeof raw[t.type] === "boolean" ? (raw[t.type] as boolean) : t.default]),
  ) as EmailPrefs;
}

export function wantsEmail(stored: unknown, type: string) {
  const prefs = resolveEmailPrefs(stored);
  return type in prefs ? prefs[type as EmailType] : false;
}
