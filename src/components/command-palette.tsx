"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchCommandPaletteAction } from "@/app/actions/command-palette";
import type { SearchResult } from "@/lib/global-search";

// ============================================================================
// Static items shown when the input is empty: pages + quick actions
// ============================================================================

type StaticItem = {
  id: string;
  group: "Pages" | "Actions";
  title: string;
  subtitle?: string;
  icon: string;
  href: string;
  keywords: string;
};

const STATIC_ITEMS: StaticItem[] = [
  { id: "p_today", group: "Pages", title: "Today", subtitle: "Daily driver view", icon: "☀️", href: "/today", keywords: "today home dashboard" },
  { id: "p_triage", group: "Pages", title: "Triage", subtitle: "Closer's cockpit", icon: "🎯", href: "/triage", keywords: "triage cockpit closer pipeline" },
  { id: "p_deals", group: "Pages", title: "Pipeline · List view", subtitle: "All deals as a table", icon: "📑", href: "/deals", keywords: "deals list pipeline" },
  { id: "p_board", group: "Pages", title: "Pipeline · Board view", subtitle: "Kanban", icon: "📋", href: "/deals/board", keywords: "pipeline kanban board deals" },
  { id: "p_buyers", group: "Pages", title: "Buyers", subtitle: "Buyer directory", icon: "👤", href: "/contacts", keywords: "buyers contacts" },
  { id: "p_sellers", group: "Pages", title: "Sellers", subtitle: "Seller companies", icon: "🏢", href: "/companies", keywords: "sellers companies" },
  { id: "p_bd", group: "Pages", title: "Bird dogs", subtitle: "Bird dog roster", icon: "🦅", href: "/bird-dogs", keywords: "bird dogs bd" },
  { id: "p_tasks", group: "Pages", title: "Tasks", subtitle: "Your queue", icon: "✓", href: "/tasks", keywords: "tasks queue" },
  { id: "p_notifs", group: "Pages", title: "Notifications", subtitle: "Sent / queued / failed", icon: "🔔", href: "/notifications", keywords: "notifications" },
  { id: "a_new_deal", group: "Actions", title: "New deal", icon: "+", href: "/deals/new", keywords: "new deal create add" },
  { id: "a_new_buyer", group: "Actions", title: "New buyer", icon: "+", href: "/contacts/new", keywords: "new buyer contact create" },
  { id: "a_new_seller", group: "Actions", title: "New seller / company", icon: "+", href: "/companies/new", keywords: "new seller company create" },
  { id: "a_new_bd", group: "Actions", title: "New bird dog", icon: "+", href: "/bird-dogs/new", keywords: "new bird dog create" },
];

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  deal: "Deals",
  buyer: "Buyers",
  seller: "Sellers",
  bird_dog: "Bird dogs",
};

const KIND_ICON: Record<SearchResult["kind"], string> = {
  deal: "🏞",
  buyer: "👤",
  seller: "🏢",
  bird_dog: "🦅",
};

const KIND_ORDER: SearchResult["kind"][] = ["deal", "buyer", "seller", "bird_dog"];

// ============================================================================
// Component
// ============================================================================

type Item = {
  id: string;
  group: string;
  icon: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);

  // Global Cmd-K / Ctrl-K handler + custom event from the header trigger button
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    function onExternalOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onExternalOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onExternalOpen);
    };
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      // small delay so the input is rendered before focus
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced server search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      const seq = ++requestSeqRef.current;
      startTransition(async () => {
        const rows = await searchCommandPaletteAction(q);
        // Drop stale responses
        if (seq !== requestSeqRef.current) return;
        setResults(rows);
        setSelectedIdx(0);
      });
    }, 140);
    return () => clearTimeout(t);
  }, [query, open]);

  // Build the flat ordered list of items currently visible
  const items: Item[] = useMemo(() => {
    if (query.trim()) {
      const out: Item[] = [];
      for (const kind of KIND_ORDER) {
        const matches = results.filter((r) => r.kind === kind);
        for (const r of matches) {
          out.push({
            id: `${r.kind}:${r.id}`,
            group: KIND_LABEL[r.kind],
            icon: KIND_ICON[r.kind],
            title: r.title,
            subtitle: r.subtitle,
            href: r.href,
          });
        }
      }
      return out;
    }
    // Empty query → static items, filtered by typed text (only relevant if user types but server results lag)
    return STATIC_ITEMS.map((s) => ({
      id: s.id,
      group: s.group,
      icon: s.icon,
      title: s.title,
      subtitle: s.subtitle,
      href: s.href,
    }));
  }, [query, results]);

  // Group items for rendering
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const arr = map.get(it.group) ?? [];
      arr.push(it);
      map.set(it.group, arr);
    }
    return map;
  }, [items]);

  const onSelect = useCallback((href: string) => {
    setOpen(false);
    router.push(href as never);
  }, [router]);

  // Arrow key navigation
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[selectedIdx];
      if (item) onSelect(item.href);
    }
  }

  // Keep selected item in view
  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    (node as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  let flatIdx = -1;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="w-full max-w-xl rounded-xl bg-background border border-border shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <svg className="size-4 text-muted shrink-0" viewBox="0 0 16 16" fill="none">
            <path d="M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM14 14l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search deals, buyers, sellers, pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted/60"
            autoComplete="off"
            spellCheck={false}
          />
          {isPending && <span className="text-[10px] text-muted">searching…</span>}
          <kbd className="hidden sm:inline-block text-[10px] text-muted border border-border rounded px-1.5 py-0.5 font-sans">esc</kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted">
              {query.trim() ? `No matches for "${query}"` : "Start typing…"}
            </div>
          ) : (
            Array.from(grouped.entries()).map(([group, groupItems]) => (
              <div key={group}>
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-muted font-medium">
                  {group}
                </div>
                {groupItems.map((it) => {
                  flatIdx++;
                  const idx = flatIdx;
                  const selected = idx === selectedIdx;
                  return (
                    <button
                      key={it.id}
                      data-idx={idx}
                      type="button"
                      onClick={() => onSelect(it.href)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={
                        "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition " +
                        (selected ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]")
                      }
                    >
                      <span className="text-base shrink-0 w-5 text-center">{it.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block truncate">{it.title}</span>
                        {it.subtitle && (
                          <span className="block text-[11px] text-muted truncate">{it.subtitle}</span>
                        )}
                      </span>
                      {selected && (
                        <kbd className="hidden sm:inline-block text-[10px] text-muted border border-border rounded px-1.5 py-0.5 font-sans">↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-foreground/[0.02] text-[10px] text-muted flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="border border-border rounded px-1 py-0.5 font-sans">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-border rounded px-1 py-0.5 font-sans">↵</kbd> open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-border rounded px-1 py-0.5 font-sans">esc</kbd> close
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="border border-border rounded px-1 py-0.5 font-sans">⌘K</kbd> anywhere to open
          </span>
        </div>
      </div>
    </div>
  );
}
