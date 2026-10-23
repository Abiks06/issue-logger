// Self-monitoring: server errors from this app are reported to an Issue Logger
// project through the public ingestion API, the same way a customer's service
// would. Enabled by SELF_MONITOR_API_KEY; the target defaults to this app.

export type RequestInfo = { path: string; method: string };
export type ErrorContext = { routerKind: string; routePath: string; routeType: string; renderSource?: string };

const INGEST_PATH = "/api/v1/events";

/** Builds the ingestion payload, or null for errors that must not be reported (the ingestion route itself, to avoid loops). */
export function buildSelfReport(err: unknown, request: RequestInfo, context: ErrorContext, environment: string) {
  const path = request.path.split("?")[0]; // query strings can carry tokens
  if (path.startsWith(INGEST_PATH)) return null;

  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : "Non-error thrown");
  const digest = (err as { digest?: unknown })?.digest;
  const firstLine = e.message.split("\n")[0].trim() || "(no message)";
  return {
    title: `${e.name}: ${firstLine}`.slice(0, 255),
    level: "error" as const,
    environment: environment.slice(0, 40),
    message: `${request.method} ${path}\nRoute: ${context.routePath} (${context.routeType}, ${context.routerKind})`.slice(0, 20_000),
    stacktrace: e.stack?.slice(0, 50_000),
    // Group by route and error, not by the concrete URL, so /issues/1 and /issues/2 share one issue.
    fingerprint: `${context.routePath}|${e.name}|${firstLine}`.slice(0, 200),
    metadata: {
      method: request.method,
      path,
      routePath: context.routePath,
      routeType: context.routeType,
      ...(context.renderSource ? { renderSource: context.renderSource } : {}),
      ...(typeof digest === "string" ? { digest } : {}),
    },
  };
}

export function selfMonitorTarget(env: Record<string, string | undefined> = process.env) {
  const key = env.SELF_MONITOR_API_KEY?.trim();
  if (!key) return null;
  const base =
    env.SELF_MONITOR_URL?.trim() ||
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return { key, url: `${base.replace(/\/+$/, "")}${INGEST_PATH}` };
}

/** Fire-and-forget report. Never throws: monitoring must not make a failing request worse. */
export async function reportRequestError(err: unknown, request: RequestInfo, context: ErrorContext) {
  const target = selfMonitorTarget();
  if (!target) return;
  const payload = buildSelfReport(err, request, context, process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production");
  if (!payload) return;
  try {
    await fetch(target.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${target.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
  } catch (reportErr) {
    console.warn("[self-monitor] could not report error:", reportErr instanceof Error ? reportErr.message : reportErr);
  }
}
