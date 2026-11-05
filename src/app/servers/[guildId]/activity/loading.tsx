import { HeaderSkeleton, RowsSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}
      </div>
      <RowsSkeleton rows={6} />
    </div>
  );
}
