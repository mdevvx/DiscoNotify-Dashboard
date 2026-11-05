import { HeaderSkeleton, RowsSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-11 w-24 rounded-full" />)}
        </div>
        <Skeleton className="h-11 w-36" />
      </div>
      <RowsSkeleton rows={3} />
    </div>
  );
}
