// Placeholder shapes shown by loading.tsx files while a page's data loads.

export function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6" role="status" aria-label="Loading">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4">
            <Bone className="h-3 w-20" />
            <Bone className="mt-3 h-7 w-12" />
          </div>
        ))}
      </div>
      <ListSkeleton rows={6} />
    </div>
  );
}

export function ListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden" role="status" aria-label="Loading">
      <div className="h-9 border-b border-line bg-surface-2/50" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-0">
          <Bone className="h-3.5 w-3.5 rounded-full" />
          <Bone className="h-3 w-14" />
          <Bone className={`h-3 ${["w-1/2", "w-2/3", "w-2/5", "w-3/5"][i % 4]}`} />
          <Bone className="ml-auto h-5 w-5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden px-4 py-14 sm:px-6" role="status" aria-label="Loading">
      {[3, 4, 2, 1, 3].map((cards, c) => (
        <div key={c} className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-surface-2/60 p-2">
          <Bone className="mx-1 my-1.5 h-3.5 w-24" />
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="card p-3">
              <Bone className="h-2.5 w-12" />
              <Bone className="mt-2 h-3.5 w-full" />
              <Bone className="mt-1.5 h-3.5 w-2/3" />
              <div className="mt-3 flex justify-between">
                <Bone className="h-3 w-10" />
                <Bone className="h-4 w-4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function IssueSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:flex-row" role="status" aria-label="Loading">
      <div className="min-w-0 flex-1">
        <Bone className="h-3 w-40" />
        <Bone className="mt-4 h-7 w-3/4" />
        <div className="mt-6 flex flex-col gap-2">
          {["w-full", "w-11/12", "w-4/5", "w-2/3", "w-3/4"].map((w, i) => <Bone key={i} className={`h-3.5 ${w}`} />)}
        </div>
      </div>
      <div className="card flex w-full shrink-0 flex-col gap-3 p-4 lg:w-72">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="h-3 w-16" />
            <Bone className="h-3 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
