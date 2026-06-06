"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Mobile nav drawer toggle. Renders a hamburger button (visible only at
 * mobile widths). When tapped, slides the existing sidebar in from the
 * left over a backdrop. Auto-closes on route change.
 *
 * The sidebar HTML is rendered by the layout — this component just
 * controls its visibility by toggling the data-state on document.body,
 * which CSS in globals.css reads.
 */
export function MobileNavToggle() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close when navigating to another page
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Reflect state on <body> so the sidebar CSS can react.
  useEffect(() => {
    if (open) document.body.setAttribute("data-mobile-nav", "open");
    else document.body.removeAttribute("data-mobile-nav");
    return () => document.body.removeAttribute("data-mobile-nav");
  }, [open]);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="md:hidden inline-flex items-center justify-center size-8 rounded-md text-foreground/70 hover:text-foreground hover:bg-foreground/[0.05] transition shrink-0"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Backdrop, only on mobile when open */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
