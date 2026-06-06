"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts.
 *
 * Standalone shortcuts (no prefix):
 *   ?   open this help overlay
 *   n   new entity for the current page (n on /deals -> /deals/new)
 *   /   focus the command palette / search
 *
 * Two-key shortcuts (vim-style "g" namespace):
 *   g t   go Today
 *   g d   go Deals
 *   g c   go Contacts (buyers)
 *   g s   go Sellers (companies)
 *   g b   go Bird dogs
 *   g k   go Kanban board
 *   g i   go Triage
 *
 * Skipped when the user is typing into an input/textarea/select.
 */

const SHORTCUTS = [
  { combo: "?",       label: "Show this help overlay" },
  { combo: "n",       label: "New (deal / buyer / etc. based on current page)" },
  { combo: "⌘K",       label: "Open command palette / global search" },
  { combo: "esc",     label: "Close drawer / palette" },
  { combo: "g t",     label: "Go to Today" },
  { combo: "g d",     label: "Go to Deals" },
  { combo: "g c",     label: "Go to Contacts (buyers)" },
  { combo: "g s",     label: "Go to Sellers" },
  { combo: "g b",     label: "Go to Bird dogs" },
  { combo: "g k",     label: "Go to Kanban board" },
  { combo: "g i",     label: "Go to Triage" },
] as const;

type GoMap = Record<string, string>;
const GO: GoMap = {
  t: "/today",
  d: "/deals",
  c: "/contacts",
  s: "/companies",
  b: "/bird-dogs",
  k: "/deals/board",
  i: "/triage",
};

const NEW_PAGE: Array<[RegExp, string]> = [
  [/^\/deals(\b|$)/,    "/deals/new"],
  [/^\/contacts(\b|$)/, "/contacts/new"],
  [/^\/companies(\b|$)/,"/companies/new"],
  [/^\/bird-dogs(\b|$)/,"/bird-dogs/new"],
];

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  useEffect(() => {
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    function onKey(e: KeyboardEvent) {
      // Always allow Escape to close help, even when typing.
      if (e.key === "Escape" && helpOpen) {
        setHelpOpen(false);
        e.preventDefault();
        return;
      }
      // Skip everything else when the user is typing.
      if (isTyping(e.target)) return;
      // Modifier-only events are not shortcuts (Cmd-K handled by palette).
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key;

      // Two-key g* sequences.
      if (pendingG) {
        if (gTimer) clearTimeout(gTimer);
        setPendingG(false);
        const dest = GO[k.toLowerCase()];
        if (dest) {
          router.push(dest as never);
          e.preventDefault();
        }
        return;
      }
      if (k === "g") {
        setPendingG(true);
        gTimer = setTimeout(() => setPendingG(false), 1200);
        e.preventDefault();
        return;
      }

      if (k === "?") {
        setHelpOpen((o) => !o);
        e.preventDefault();
        return;
      }

      if (k.toLowerCase() === "n") {
        const path = window.location.pathname;
        for (const [re, dest] of NEW_PAGE) {
          if (re.test(path)) {
            router.push(dest as never);
            e.preventDefault();
            return;
          }
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      if (gTimer) clearTimeout(gTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [helpOpen, pendingG, router]);

  // Visual indicator when "g" is pressed and we're waiting for second key
  return (
    <>
      {pendingG && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-xs font-medium px-3 py-1.5 rounded-md shadow-lg animate-in fade-in duration-100">
          g…
        </div>
      )}
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
    </>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-100 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl bg-surface border border-border shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Keyboard shortcuts</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-foreground transition"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M3 3l10 10M13 3 3 13" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <ul className="px-5 py-3 divide-y divide-border">
          {SHORTCUTS.map((s) => (
            <li key={s.combo} className="flex items-center justify-between py-2">
              <span className="text-sm">{s.label}</span>
              <kbd className="text-[11px] border border-border rounded px-2 py-0.5 font-sans bg-background min-w-[2.5rem] text-center">
                {s.combo}
              </kbd>
            </li>
          ))}
        </ul>
        <footer className="px-5 py-2.5 border-t border-border bg-foreground/[0.02] text-[11px] text-muted">
          Press <kbd className="border border-border rounded px-1 font-sans">?</kbd> any time to reopen.
        </footer>
      </div>
    </div>
  );
}
