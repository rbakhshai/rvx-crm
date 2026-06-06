"use client";

import { useState } from "react";

/**
 * Tiny interactive bits used by the static server-rendered variants.
 */

export function FocusBriefLine({ brief }: { brief: { contentMd: string; createdAt: string } | null }) {
  const [open, setOpen] = useState(false);
  if (!brief) return null;

  // Pull the first non-empty line of the brief — that's our one-liner.
  const firstLine = brief.contentMd
    .split(/\n+/)
    .map((s) => s.replace(/^[-*]\s+/, "").replace(/\*\*/g, "").trim())
    .find((s) => s.length > 0) ?? "";

  return (
    <div className="rounded-lg border border-border bg-foreground/[0.02] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-start gap-2"
      >
        <span className="text-base shrink-0 leading-snug">✨</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted font-medium">Morning brief</div>
          <div className={"text-sm text-foreground/90 mt-0.5 " + (open ? "" : "truncate")}>{firstLine}</div>
          {open && (
            <pre className="mt-3 whitespace-pre-wrap text-sm text-foreground/80 font-sans leading-relaxed">
              {brief.contentMd}
            </pre>
          )}
        </div>
        <span className="text-xs text-muted shrink-0">{open ? "collapse" : "expand →"}</span>
      </button>
    </div>
  );
}

type TabKey = "mentions" | "tasks" | "atrisk";
type TabSpec = { key: TabKey; label: string; count: number; content: React.ReactNode };

/**
 * MockTabs takes the per-tab content as serializable ReactNodes (NOT a
 * render-prop function). This matters because the parent is a Server
 * Component — RSC can pass serialized JSX across the server/client
 * boundary, but not function values.
 */
export function MockTabs({ tabs }: { tabs: TabSpec[] }) {
  const [active, setActive] = useState<TabKey>(tabs[0]?.key ?? "mentions");
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <section className="rounded-xl border border-border bg-background">
      <header className="flex border-b border-border">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={
                "px-4 py-2.5 text-sm border-b-2 transition inline-flex items-center gap-2 " +
                (isActive
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted hover:text-foreground")
              }
            >
              <span>{t.label}</span>
              <span
                className={
                  "tabular-nums rounded-full px-1.5 text-[10px] font-medium " +
                  (isActive ? "bg-primary/15 text-primary" : "bg-foreground/[0.06] text-foreground/60")
                }
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </header>
      <div className="px-4 py-3">{activeTab?.content ?? null}</div>
    </section>
  );
}
