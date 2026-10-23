"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, Copy, KeyRound, Plus } from "lucide-react";
import { createApiKey, revokeApiKey } from "@/actions/projects";
import { TimeAgo } from "@/components/ui/bits";
import ConfirmButton from "@/components/ui/ConfirmButton";

type Lang = "curl" | "node" | "python";
const LANGS: { id: Lang; label: string }[] = [
  { id: "curl", label: "curl" },
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
];

function nodeSnippet(endpoint: string, key: string) {
  return `// Report uncaught errors from a Node.js process (Node 18+).
const ENDPOINT = "${endpoint}";
const API_KEY = process.env.ISSUE_LOGGER_KEY ?? "${key}";

async function report(err, extra = {}) {
  const e = err instanceof Error ? err : new Error(String(err));
  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: \`Bearer \${API_KEY}\`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: \`\${e.name}: \${e.message}\`.slice(0, 200),
        level: "error",
        environment: process.env.NODE_ENV ?? "production",
        stacktrace: e.stack,
        ...extra,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Never let error reporting crash the app.
  }
}

process.on("unhandledRejection", (reason) => void report(reason));
process.on("uncaughtException", async (err) => {
  await report(err, { level: "fatal" });
  process.exit(1);
});`;
}

function pythonSnippet(endpoint: string, key: string) {
  return `# Report uncaught exceptions from a Python process (needs requests).
import os, sys, traceback, requests

ENDPOINT = "${endpoint}"
API_KEY = os.environ.get("ISSUE_LOGGER_KEY", "${key}")

def report(exc_type, exc, tb, level="error"):
    try:
        requests.post(
            ENDPOINT,
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={
                "title": f"{exc_type.__name__}: {exc}"[:200],
                "level": level,
                "environment": os.environ.get("APP_ENV", "production"),
                "stacktrace": "".join(traceback.format_exception(exc_type, exc, tb)),
            },
            timeout=3,
        )
    except Exception:
        pass  # never let error reporting crash the app

def excepthook(exc_type, exc, tb):
    report(exc_type, exc, tb, level="fatal")
    sys.__excepthook__(exc_type, exc, tb)

sys.excepthook = excepthook`;
}

type Key = {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdBy: { name: string } | null;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-icon h-7 w-7"
      aria-label="Copy"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function ApiKeysSettings({ projectId, apiKeys, endpoint }: { projectId: string; apiKeys: Key[]; endpoint: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("curl");
  const key = secret ?? "il_your_key";

  const curl = `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "TypeError: Cannot read properties of undefined",
    "level": "error",
    "environment": "production",
    "message": "Checkout failed for order 1234",
    "stacktrace": "at submitOrder (src/checkout.ts:42:13)"
  }'`;
  const snippets: Record<Lang, string> = { curl, node: nodeSnippet(endpoint, key), python: pythonSnippet(endpoint, key) };

  return (
    <div className="flex flex-col gap-3">
      <form
        className="card flex gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await createApiKey(projectId, { name });
            if (!res.ok) return void toast.error(res.error);
            setSecret(res.data.secret);
            setName("");
            router.refresh();
          });
        }}
      >
        <input className="input" placeholder="Key name, e.g. production-api" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Key name" />
        <button className="btn-secondary h-9" disabled={pending || !name.trim()}>
          <Plus className="h-4 w-4" /> Create key
        </button>
      </form>

      {secret && (
        <div className="animate-pop rounded-lg border border-success/40 bg-success/10 p-3">
          <p className="text-[13px] font-medium">Copy your key now. It won&apos;t be shown again.</p>
          <div className="mt-2 flex items-center gap-1 rounded-md border border-line bg-surface px-2">
            <code className="min-w-0 flex-1 truncate py-1.5 font-mono text-xs">{secret}</code>
            <CopyButton text={secret} />
          </div>
        </div>
      )}

      {apiKeys.length > 0 && (
        <ul className="card divide-y divide-line">
          {apiKeys.map((k) => (
            <li key={k.id} className={`flex items-center gap-3 px-3 py-2.5 ${k.revokedAt ? "opacity-55" : ""}`}>
              <KeyRound className="h-4 w-4 shrink-0 text-faint" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {k.name} <span className="font-mono text-xs font-normal text-faint">{k.prefix}…</span>
                </p>
                <p className="truncate text-xs text-faint">
                  {k.revokedAt ? <>Revoked <TimeAgo date={k.revokedAt} /></> : k.lastUsedAt ? <>Last used <TimeAgo date={k.lastUsedAt} /></> : "Never used"}
                  {" · "}created <TimeAgo date={k.createdAt} />{k.createdBy && ` by ${k.createdBy.name}`}
                </p>
              </div>
              {!k.revokedAt && (
                <ConfirmButton
                  className="btn-ghost h-7 px-2 text-xs text-danger hover:text-danger"
                  title={`Revoke "${k.name}"?`}
                  description="Services using this key will start getting 401 errors immediately."
                  confirmLabel="Revoke"
                  onConfirm={async () => {
                    const res = await revokeApiKey(k.id);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success("Key revoked");
                    router.refresh();
                  }}
                >
                  Revoke
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
      )}

      <details className="card group p-3" open={Boolean(secret)}>
        <summary className="cursor-pointer text-[13px] font-medium">How to send events</summary>
        <div className="mt-3 flex flex-col gap-2 text-[13px] text-muted">
          <p>
            <code className="rounded bg-surface-2 px-1 font-mono text-xs">POST /api/v1/events</code> creates an issue the first time an error is seen. Later events with the
            same fingerprint add to its occurrence count, and an event for a resolved issue reopens it as a regression.
          </p>
          <div className="flex gap-1" role="tablist" aria-label="Snippet language">
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={lang === l.id}
                className={`h-7 rounded-md px-2.5 text-xs font-medium ${lang === l.id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}
                onClick={() => setLang(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <pre className="overflow-x-auto rounded-md border border-line bg-surface-2 p-3 font-mono text-[11.5px] leading-relaxed text-fg">{snippets[lang]}</pre>
            <span className="absolute right-1.5 top-1.5"><CopyButton text={snippets[lang]} /></span>
          </div>
          {lang !== "curl" && (
            <p className="text-xs">
              Run this on your server, never in the browser: the key would be visible to anyone, and the endpoint doesn&apos;t accept cross-origin
              requests. Keep the key in an environment variable rather than in code.
            </p>
          )}
          <p className="text-xs">
            Fields: <code>title</code> (required), <code>level</code> (fatal · error · warning · info), <code>message</code>, <code>stacktrace</code>,{" "}
            <code>environment</code>, <code>fingerprint</code> (optional custom grouping key), <code>metadata</code> (object). Limit 120 requests/minute per key.
            Read issues back with <code>GET /api/v1/issues?status=TODO,IN_PROGRESS</code>.
          </p>
        </div>
      </details>
    </div>
  );
}
