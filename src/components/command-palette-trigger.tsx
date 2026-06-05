"use client";

import { useEffect, useState } from "react";

/**
 * Search-bar-styled button that opens the command palette.
 * Dispatches a window event the palette listens for (also opens via Cmd-K).
 */
export function CommandPaletteTrigger() {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
      className="group flex items-center gap-3 w-full max-w-md rounded-md border border-border bg-foreground/[0.02] hover:bg-foreground/[0.05] px-3 py-1.5 text-sm text-muted transition"
    >
      <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="none">
        <path d="M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM14 14l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="flex-1 text-left group-hover:text-foreground transition">
        Search or jump to&hellip;
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] border border-border rounded px-1.5 py-0.5 font-sans bg-background">
        {isMac ? "⌘" : "Ctrl"}<span>K</span>
      </kbd>
    </button>
  );
}
