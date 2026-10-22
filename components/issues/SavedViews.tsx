"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Bookmark, BookmarkPlus, X } from "lucide-react";
import { createSavedView, deleteSavedView } from "@/actions/projects";

type View = { id: string; name: string; query: string };

/** Named filter presets above the list; "Save view" stores the current URL filters. */
export default function SavedViews({
  projectId,
  basePath,
  views,
  currentQuery,
}: {
  projectId: string;
  basePath: string;
  views: View[];
  /** The current filters as a query string ("" for none). */
  currentQuery: string;
}) {
  const router = useRouter();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const alreadySaved = views.some((v) => v.query === currentQuery);

  const chip = (active: boolean) =>
    `group inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors ${
      active ? "border-accent/50 bg-accent-soft text-fg" : "border-line bg-surface text-muted hover:text-fg"
    }`;

  const save = () =>
    startTransition(async () => {
      const res = await createSavedView(projectId, { name, query: currentQuery });
      if (!res.ok) return void toast.error(res.error);
      toast.success("View saved");
      setNaming(false);
      setName("");
      router.refresh();
    });

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1" aria-label="Saved views">
      <Link href={basePath} className={chip(currentQuery === "")}>All issues</Link>
      <Link href={`${basePath}?assignee=me`} className={chip(currentQuery === "?assignee=me")}>Mine</Link>
      {views.map((v) => (
        <span key={v.id} className={chip(currentQuery === v.query)}>
          <Bookmark className="h-3 w-3" />
          <Link href={`${basePath}${v.query}`}>{v.name}</Link>
          <button
            className="-mr-1 rounded-full p-0.5 opacity-0 hover:bg-surface-3 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Delete view ${v.name}`}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteSavedView(v.id);
                if (!res.ok) return void toast.error(res.error);
                router.refresh();
              })
            }
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {currentQuery !== "" && currentQuery !== "?assignee=me" && !alreadySaved && (
        naming ? (
          <form
            className="flex shrink-0 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              autoFocus
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setNaming(false)}
              placeholder="View name"
              className="input h-7 w-36 rounded-full text-xs"
              aria-label="View name"
            />
            <button className="btn-primary h-7 rounded-full px-2.5 text-xs" disabled={pending || !name.trim()}>Save</button>
          </form>
        ) : (
          <button className={`${chip(false)} border-dashed`} onClick={() => setNaming(true)}>
            <BookmarkPlus className="h-3 w-3" /> Save view
          </button>
        )
      )}
    </div>
  );
}
