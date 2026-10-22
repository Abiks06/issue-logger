import { z } from "zod";
import { PRIORITIES, ROLES, STATUSES, TYPES } from "@/lib/constants";

// ─── Auth ─────────────────────────────────────────────────────────────

const email = z.string().trim().toLowerCase().pipe(z.email("Invalid email address"));
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── Projects ─────────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour");

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,5}$/, "2–6 letters or digits, starting with a letter")
    .refine((k) => k !== "NEW", "That key is reserved"),
  description: z.string().trim().max(2000).default(""),
  color: hexColor,
});

export const projectSettingsSchema = projectSchema.omit({ key: true });

export const labelSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(32),
  color: hexColor,
});

export const inviteSchema = z.object({
  email,
  role: z.enum(ROLES).exclude(["OWNER"]),
});

export const apiKeySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
});

// ─── Issues ───────────────────────────────────────────────────────────

const optionalId = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });

const issueFields = {
  title: z.string().trim().min(1, "Title is required").max(255),
  description: z.string().max(50_000),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  type: z.enum(TYPES),
  assigneeId: optionalId,
  parentId: optionalId,
  dueDate: optionalDate,
  estimate: z.number().int().min(0).max(100).nullable().optional(),
  labelIds: z.array(z.string()).max(20),
};

export const issueSchema = z.object({
  ...issueFields,
  description: issueFields.description.default(""),
  status: issueFields.status.default("TODO"),
  priority: issueFields.priority.default("NONE"),
  type: issueFields.type.default("TASK"),
  labelIds: issueFields.labelIds.default([]),
});

export type IssueInput = z.input<typeof issueSchema>;

/**
 * Partial update used by inline property editors. Built from the bare fields:
 * in Zod 4 `.partial()` still applies defaults, which would reset omitted fields.
 */
export const issuePatchSchema = z.object(issueFields).partial();

export type IssuePatch = z.input<typeof issuePatchSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty").max(20_000),
});

// ─── Ingestion API ────────────────────────────────────────────────────

export const ingestEventSchema = z.object({
  title: z.string().trim().min(1).max(255),
  message: z.string().max(20_000).optional(),
  level: z.enum(["fatal", "error", "warning", "info"]).default("error"),
  fingerprint: z.string().trim().min(1).max(200).optional(),
  environment: z.string().trim().max(40).optional(),
  stacktrace: z.string().max(50_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type IngestEvent = z.infer<typeof ingestEventSchema>;
