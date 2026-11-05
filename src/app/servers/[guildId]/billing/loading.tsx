import { CardSkeleton, HeaderSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton height="h-72" />
          <CardSkeleton height="h-72" />
        </div>
        <CardSkeleton height="h-48" />
        <CardSkeleton height="h-40" />
      </div>
    </div>
  );
}
