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
      {action && <Skeleton className="h-10 w-32" />}
    </div>
  );
}

export function RowsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <Card className={className} aria-hidden="true">
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-20" />
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
