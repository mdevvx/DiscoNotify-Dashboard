import { CardSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="-ml-2 mb-3 h-10 w-28" />
      <div className="grid gap-4">
        <CardSkeleton height="h-32" />
        <CardSkeleton height="h-28" />
        <CardSkeleton height="h-72" />
        <CardSkeleton height="h-56" />
      </div>
    </div>
  );
}
