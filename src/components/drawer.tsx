"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Side-drawer used by intercepted routes (e.g. (.)/deals/[id]/page.tsx
 * renders inside one). Slides in from the right on top of a dimmed backdrop.
 *
 * Dismissal:
 *   - X button         -> router.back()
 *   - Backdrop click   -> router.back()
 *   - ESC key          -> router.back()
 *   - "Open full" link -> hard-navigate to fullHref so browser back returns
 *                        to the list with the drawer NOT open.
 *
 * Body scroll is locked while the drawer is open.
 */
export function Drawer({
  title,
  subtitle,
  fullHref,
  children,
  width = "60vw",
}: {
  title: string;
  subtitle?: string;
  /** Direct URL of the entity for "Open in full" link. */
  fullHref: string;
  children: React.ReactNode;
  /** CSS width, e.g. "60vw" or "640px". Caps at min(width, 92vw). */
  width?: string;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        router.back();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Auto-focus the panel so keyboard nav within works
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => router.back()}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative h-screen bg-background border-l border-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200 focus:outline-none"
        style={{ width: `min(${width}, 92vw)` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Sticky header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{title}</div>
            {subtitle && <div className="text-xs text-muted truncate">{subtitle}</div>}
          </div>
          <Link
            href={fullHref as never}
            className="text-xs text-muted hover:text-foreground hover:underline shrink-0"
            title="Open in full page"
          >
            Open full ↗
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Close"
            className="inline-flex items-center justify-center size-7 rounded-md text-muted hover:text-foreground hover:bg-foreground/[0.05] transition shrink-0"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M3 3l10 10M13 3 3 13" />
            </svg>
          </button>
        </header>

        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
