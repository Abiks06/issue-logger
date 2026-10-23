import type { Instrumentation } from "next";

// Runs once when a server instance starts, before it handles requests.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("@/lib/env");
    assertEnv();
  }
}

// Called for every uncaught server error (pages, route handlers, server actions, proxy).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SELF_MONITOR_API_KEY) return;
  const { reportRequestError } = await import("@/lib/self-monitor");
  await reportRequestError(err, request, context);
};
