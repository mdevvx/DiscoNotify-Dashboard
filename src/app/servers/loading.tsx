import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="min-h-dvh">
      <div className="h-16 border-b border-border" />
      <div className="mx-auto max-w-310 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3">
            <Skeleton className="h-12 w-72 max-w-full" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
          <Skeleton className="h-10 w-72 max-w-full" />
        </div>
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col items-center rounded-2xl border border-border bg-surface p-5">
              <Skeleton className="size-19 rounded-full" />
              <Skeleton className="mt-3.5 h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-40" />
              <Skeleton className="mt-2 h-5 w-14 rounded-full" />
              <Skeleton className="mt-4 h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
