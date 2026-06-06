"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/skeleton";

/**
 * Drawer skeleton while the intercepted route's server data loads.
 * Slides in like the real drawer, then gets replaced when ready.
 */
export default function DrawerLoading() {
  const router = useRouter();

  // ESC + backdrop still close, same as real drawer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => router.back()} aria-hidden />
      <div
        className="relative h-screen bg-background border-l border-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
        style={{ width: "min(640px, 92vw)" }}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur px-5 py-3">
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </header>
        <div className="px-5 py-4 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-10" />
          </div>
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-2 w-16" />
                <Skeleton className="h-4 w-20 mt-1.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
