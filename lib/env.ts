import { z } from "zod";

// Environment checks, run once at server start (instrumentation.ts). Pure so
// it can be unit-tested; production refuses to start on errors, development
// only warns.

const url = z.url();

const schema = z.object({
  DATABASE_URL: z.string().min(1, "is required").refine((v) => /^postgres(ql)?:\/\//.test(v), "must be a postgres:// URL"),
  DIRECT_URL: z.string().refine((v) => /^postgres(ql)?:\/\//.test(v), "must be a postgres:// URL").optional(),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: url.optional(),
  AUTH_URL: url.optional(),
  NEXTAUTH_URL: url.optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/, "must be a port number").optional(),
  RESEND_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type EnvReport = { errors: string[]; warnings: string[] };

/** Validates `source` (normally process.env). Empty strings count as unset. */
export function validateEnv(source: Record<string, string | undefined>, production: boolean): EnvReport {
  const env = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v.trim() !== ""));
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${issue.path.join(".")} ${issue.message}`);
  }

  const secret = env.AUTH_SECRET ?? env.NEXTAUTH_SECRET;
  if (!secret) errors.push("AUTH_SECRET is required (any long random string)");
  else if (secret.length < 32) (production ? errors : warnings).push("AUTH_SECRET should be at least 32 characters");

  if (production && !env.NEXT_PUBLIC_APP_URL && !env.AUTH_URL && !env.NEXTAUTH_URL && !env.VERCEL_URL) {
    warnings.push("NEXT_PUBLIC_APP_URL is unset; links in emails will point to localhost");
  }
  if (production && !env.RESEND_API_KEY && !env.SMTP_HOST) {
    warnings.push("No mail transport (RESEND_API_KEY or SMTP_HOST); sign-up verification and invites can't be emailed");
  }
  if (env.CRON_SECRET && env.CRON_SECRET.length < 16) warnings.push("CRON_SECRET should be at least 16 characters");

  return { errors, warnings };
}

/** Logs the report; throws in production when there are errors. */
export function assertEnv(source = process.env, production = process.env.NODE_ENV === "production") {
  const { errors, warnings } = validateEnv(source as Record<string, string | undefined>, production);
  for (const w of warnings) console.warn(`[env] ${w}`);
  if (errors.length === 0) return;
  const message = `Invalid environment configuration:\n  - ${errors.join("\n  - ")}\nSee .env.example.`;
  if (production) throw new Error(message);
  console.error(`[env] ${message}`);
}
