"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isBusy() {
  const el = document.activeElement as HTMLElement | null;
  const typing = el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
  return Boolean(typing || document.querySelector("dialog[open], [role=listbox], [role=dialog]"));
}

/**
 * Keeps a page current while teammates work: re-fetches server data every
 * `intervalMs` and whenever the tab regains focus, but never while the user is
 * typing or has a menu or dialog open.
 */
export default function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && !isBusy()) router.refresh();
    };
    const timer = setInterval(refresh, intervalMs);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
