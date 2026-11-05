import { CardSkeleton, HeaderSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <div className="grid gap-4">
        <CardSkeleton height="h-20" />
        <CardSkeleton height="h-44" />
        <CardSkeleton height="h-40" />
        <CardSkeleton height="h-32" />
      </div>
    </div>
  );
}
