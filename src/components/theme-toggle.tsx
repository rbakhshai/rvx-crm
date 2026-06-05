"use client";

import { useEffect, useState } from "react";

/**
 * Subtle light/dark toggle. Sits in the top-right of the app header.
 * - Reads the current theme from <html>'s class (set by the no-flash inline
 *   script in src/app/layout.tsx) on mount.
 * - Persists choice to localStorage under "theme".
 * - SVG icon swap on toggle: sun in light, moon in dark.
 *
 * Deliberately under-decorated — small, monochrome, no labels, ghost-button
 * background. The user asked for "incognito and subtle".
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  // Hydrate from the DOM (which the no-flash script already touched).
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    try { localStorage.setItem("theme", next); } catch {}
  }

  // SSR + first render: render nothing (avoid hydration mismatch and any flicker).
  if (theme === null) return <span className="size-7 inline-block" aria-hidden />;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex items-center justify-center size-7 rounded-md text-foreground/55 hover:text-foreground hover:bg-foreground/[0.05] transition"
    >
      {isDark ? (
        // Moon
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      ) : (
        // Sun
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
