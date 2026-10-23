"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, CircleAlert, Copy, Plus, Send, Webhook as WebhookIcon } from "lucide-react";
import { createWebhook, deleteWebhook, sendTestWebhook, updateWebhook } from "@/actions/integrations";
import { WEBHOOK_EVENTS, flavorOf } from "@/lib/webhook-events";
import { TimeAgo } from "@/components/ui/bits";
import ConfirmButton from "@/components/ui/ConfirmButton";

type Delivery = { id: string; event: string; status: string; attempts: number; responseCode: number | null; error: string | null; createdAt: Date };
type Hook = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastStatus: number | null;
  lastError: string | null;
  lastDeliveredAt: Date | null;
  deliveries: Delivery[];
};

const FLAVOR_LABEL = { slack: "Slack", discord: "Discord", json: "JSON" } as const;
const ALL_EVENTS = WEBHOOK_EVENTS.map((e) => e.event as string);

export default function WebhooksSettings({ projectId, hooks }: { projectId: string; hooks: Hook[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(ALL_EVENTS);
  const [secret, setSecret] = useState<string | null>(null);

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error ?? "Something went wrong");
      if (success) toast.success(success);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <form
        className="card flex flex-col gap-3 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await createWebhook(projectId, { url, events });
            if (!res.ok) return void toast.error(res.error);
            setSecret(res.data.secret);
            setUrl("");
            router.refresh();
          });
        }}
      >
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="https://hooks.slack.com/services/… or your endpoint"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Webhook URL"
          />
          <button className="btn-secondary h-9" disabled={pending || !url.trim() || events.length === 0}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <fieldset className="flex flex-wrap gap-x-4 gap-y-1.5">
          <legend className="sr-only">Events</legend>
          {WEBHOOK_EVENTS.map((e) => (
            <label key={e.event} className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={events.includes(e.event)}
                onChange={() => setEvents((cur) => (cur.includes(e.event) ? cur.filter((x) => x !== e.event) : [...cur, e.event]))}
              />
              {e.label}
            </label>
          ))}
        </fieldset>
        {url.trim() && <p className="text-[11px] text-faint">Detected format: {FLAVOR_LABEL[flavorOf(url.trim())]}</p>}
      </form>

      {secret && (
        <div className="animate-pop rounded-lg border border-success/40 bg-success/10 p-3">
          <p className="text-[13px] font-medium">Signing secret: copy it now, it won&apos;t be shown again.</p>
          <div className="mt-2 flex items-center gap-1 rounded-md border border-line bg-surface px-2">
            <code className="min-w-0 flex-1 truncate py-1.5 font-mono text-xs">{secret}</code>
            <button
              type="button"
              className="btn-icon h-7 w-7"
              aria-label="Copy secret"
              onClick={async () => {
                await navigator.clipboard.writeText(secret);
                toast.success("Copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Verify requests by computing HMAC-SHA256 of <code>&lt;X-IssueLogger-Timestamp&gt;.&lt;body&gt;</code> with this secret and comparing it to{" "}
            <code>X-IssueLogger-Signature</code>. Slack and Discord ignore the signature.
          </p>
        </div>
      )}

      {hooks.length > 0 && (
        <ul className="card divide-y divide-line">
          {hooks.map((h) => {
            const ok = h.lastStatus !== null && h.lastStatus >= 200 && h.lastStatus < 300;
            return (
              <li key={h.id} className={`flex flex-col gap-2 p-3 ${h.active ? "" : "opacity-60"}`}>
                <div className="flex items-center gap-2.5">
                  <WebhookIcon className="h-4 w-4 shrink-0 text-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">{h.url}</p>
                    <p className="text-[11px] text-faint">
                      {FLAVOR_LABEL[flavorOf(h.url)]} · {h.events.length === ALL_EVENTS.length ? "all events" : h.events.join(", ")}
                      {h.lastDeliveredAt && <> · last delivered <TimeAgo date={h.lastDeliveredAt} /></>}
                    </p>
                  </div>
                  {h.lastStatus !== null || h.lastError ? (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${ok ? "text-success" : "text-danger"}`} title={h.lastError ?? undefined}>
                      {ok ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
                      {ok ? `HTTP ${h.lastStatus}` : h.lastError ?? `HTTP ${h.lastStatus}`}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button className="btn-ghost h-7 px-2 text-xs" disabled={pending} onClick={() => act(() => sendTestWebhook(h.id), "Test delivered")}>
                    <Send className="h-3 w-3" /> Send test
                  </button>
                  <button className="btn-ghost h-7 px-2 text-xs" disabled={pending} onClick={() => act(() => updateWebhook(h.id, { active: !h.active }), h.active ? "Paused" : "Resumed")}>
                    {h.active ? "Pause" : "Resume"}
                  </button>
                  <ConfirmButton
                    className="btn-ghost h-7 px-2 text-xs text-danger hover:text-danger"
                    title="Delete this webhook?"
                    description="Pending deliveries to it are discarded."
                    onConfirm={async () => act(() => deleteWebhook(h.id), "Webhook deleted")}
                  >
                    Delete
                  </ConfirmButton>
                </div>
                {h.deliveries.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-faint hover:text-muted">Recent deliveries</summary>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {h.deliveries.map((d) => (
                        <li key={d.id} className="flex items-center gap-2 text-[11px]">
                          <span className={`w-14 font-medium ${d.status === "SENT" ? "text-success" : d.status === "FAILED" ? "text-danger" : "text-muted"}`}>{d.status.toLowerCase()}</span>
                          <span className="font-mono text-muted">{d.event}</span>
                          <span className="text-faint">{d.responseCode ? `HTTP ${d.responseCode}` : d.error ?? ""}{d.attempts > 1 ? ` · ${d.attempts} attempts` : ""}</span>
                          <span className="ml-auto text-faint"><TimeAgo date={d.createdAt} /></span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
