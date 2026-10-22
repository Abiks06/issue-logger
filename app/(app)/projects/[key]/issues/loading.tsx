import { Bone, ListSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-3 sm:px-6">
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => <Bone key={i} className="h-8 w-24" />)}
      </div>
      <ListSkeleton />
    </div>
  );
}
