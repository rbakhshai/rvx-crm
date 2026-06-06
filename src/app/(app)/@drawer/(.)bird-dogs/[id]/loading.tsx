"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/skeleton";

export default function BirdDogDrawerLoading() {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") router.back(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => router.back()} aria-hidden />
      <div className="relative h-screen bg-background border-l border-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200" style={{ width: "min(600px, 92vw)" }}>
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-5 py-3">
          <Skeleton className="h-3 w-40" /><Skeleton className="h-2.5 w-24 mt-1" />
        </header>
        <div className="px-5 py-4 space-y-4">
          <Skeleton className="h-6 w-20" />
          <div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i}><Skeleton className="h-2 w-16" /><Skeleton className="h-4 w-24 mt-1" /></div>)}</div>
        </div>
      </div>
    </div>
  );
}
