import { CardSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui";

// Mirrors the Overview layout (server banner, switch card, plan card, 4 tiles, lists) so nothing jumps.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-6" aria-hidden="true">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-64 max-w-[60vw]" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4">
        <CardSkeleton height="h-20" />
        <CardSkeleton height="h-28" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} height="h-28" />)}
        </div>
        <CardSkeleton height="h-32" />
        <CardSkeleton height="h-56" />
      </div>
    </div>
  );
}
