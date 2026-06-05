/**
 * Default loading skeleton for every route inside (app). Next.js renders
 * this while a server component is fetching. Replaced automatically once
 * the real page is ready. Per-route loading.tsx files can override.
 */
import { Skeleton, SkeletonRow, SkeletonStat } from "@/components/skeleton";

export default function AppLoading() {
  return (
    <div className="max-w-screen-2xl mx-auto px-8 py-10">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 pb-6 border-b border-border">
        <div>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3 w-72 mt-2" />
        </div>
        <Skeleton className="h-8 w-24" />
      </header>

      <div className="pt-6 space-y-6">
        {/* Stat row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-foreground/[0.02]">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-16" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    </div>
  );
}
