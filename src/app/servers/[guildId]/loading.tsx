import { Skeleton } from "@/components/ui";

// Mirrors the Overview layout (title, switch card, plan card, 4 tiles, lists) so nothing jumps.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-6 h-5 w-80 max-w-full" />
      <div className="grid gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-28" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}
