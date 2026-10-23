import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { ActionError } from "@/lib/access";

// Every server action returns ActionResult instead of throwing, so client
// components can show the message without an error boundary.

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err); // let redirect(), notFound() and signOut's redirect through
    if (err instanceof ActionError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) {
      return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(err).fieldErrors };
    }
    console.error(err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
