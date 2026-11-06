import { Card, Skeleton } from "@/components/ui";

/** Skeleton pieces that mirror the real components, so nothing jumps when the data arrives. */
export function HeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-3" aria-hidden="true">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72 max-w-[60vw]" />
        </div>
      </div>
      {action && <Skeleton className="h-11 w-32" />}
    </div>
  );
}

export function RowsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <Card className={className} aria-hidden="true">
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_auto] lg:items-center">
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10 sm:col-span-2" />
              <Skeleton className="h-10" />
            </div>
            <div className="flex gap-2 md:col-span-2 lg:col-span-1">
              <Skeleton className="h-9.5 w-24" />
              <Skeleton className="h-9.5 w-20" />
              <Skeleton className="h-9.5 w-20" />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function CardSkeleton({ height = "h-40" }: { height?: string }) {
  return <Skeleton aria-hidden="true" className={`${height} rounded-xl`} />;
}
