/**
 * Skeleton placeholder. Use inside loading.tsx files (or anywhere data
 * isn't ready yet) to give the user "page shape" instead of a blank
 * screen — much better perceived performance.
 */
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("inline-block rounded-md bg-foreground/[0.06] animate-pulse", className)} />;
}

/** Single row of fake table content — used in list-page loading.tsx files. */
export function SkeletonRow({ columns = 6 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-t border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={
            i === 0 ? "h-3 w-1/4" :
            i === columns - 1 ? "h-6 w-6 rounded-full ml-auto" :
            "h-3 w-1/6"
          }
        />
      ))}
    </div>
  );
}

/** Stat tile used on dashboards (Today, Settings, etc.) */
export function SkeletonStat() {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-6 w-16 mt-2" />
      <Skeleton className="h-2 w-12 mt-1" />
    </div>
  );
}
