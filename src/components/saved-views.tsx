"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  saveCurrentViewAction,
  deleteSavedViewAction,
  type ViewScope,
} from "@/app/actions/saved-views";
import { useConfirmDialog } from "@/components/confirm-dialog";
import type { SavedView } from "@/db/schema";

/**
 * Row of pinned views above the list. Each chip applies a saved filter
 * combo (its params snapshot) to the URL. The last chip is a "Save"
 * button that captures the current URL params.
 */
export function SavedViewsBar({ scope, views }: { scope: ViewScope; views: SavedView[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  const [label, setLabel] = useState("");

  // Normalize current URL params (strip empty values, sort keys) so we can
  // tell if a saved view is currently active.
  const currentParamsString = useMemo(() => {
    const entries = Array.from(params.entries())
      .filter(([k, v]) => v !== "" && k !== "view")
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(Object.fromEntries(entries));
  }, [params]);

  function paramsToHref(viewParams: Record<string, string>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(viewParams)) {
      if (typeof v === "string" && v.length > 0) qs.set(k, v);
    }
    const s = qs.toString();
    return s ? `${pathname}?${s}` : pathname;
  }

  function viewParamsString(view: SavedView): string {
    const obj = (view.params ?? {}) as Record<string, string>;
    const entries = Object.entries(obj)
      .filter(([, v]) => typeof v === "string" && v.length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(Object.fromEntries(entries));
  }

  function handleSave() {
    if (!label.trim()) return;
    const snapshot: Record<string, string> = {};
    for (const [k, v] of params.entries()) {
      if (k === "view") continue;
      if (typeof v === "string" && v.length > 0) snapshot[k] = v;
    }
    startTransition(async () => {
      try {
        await saveCurrentViewAction(scope, label.trim(), snapshot);
        toast.success(`Saved view "${label.trim()}"`);
        setLabel("");
        setSavePopoverOpen(false);
      } catch (err) {
        toast.error("Couldn't save view", {
          description: err instanceof Error ? err.message : "Try again.",
        });
      }
    });
  }

  const dialog = useConfirmDialog();
  function handleDelete(view: SavedView) {
    dialog.ask({
      title: `Remove "${view.label}"?`,
      body: "This saved view is removed for you only.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: () =>
        startTransition(async () => {
          try {
            await deleteSavedViewAction(view.id, scope);
            toast.success(`Removed "${view.label}"`);
          } catch (err) {
            toast.error("Couldn't remove", { description: err instanceof Error ? err.message : "Try again." });
          }
        }),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {dialog.node}
      <span className="text-muted mr-1">Views:</span>

      {/* "All" chip — clears every filter */}
      <Link
        href={pathname as never}
        className={
          "rounded-full px-2.5 py-0.5 border transition " +
          (currentParamsString === "{}"
            ? "bg-foreground/[0.06] border-foreground/20 text-foreground"
            : "border-border text-muted hover:bg-foreground/[0.03]")
        }
      >
        All
      </Link>

      {views.map((v) => {
        const isActive = viewParamsString(v) === currentParamsString;
        return (
          <span key={v.id} className="inline-flex items-center">
            <Link
              href={paramsToHref(v.params as Record<string, string>) as never}
              className={
                "rounded-l-full px-2.5 py-0.5 border transition " +
                (isActive
                  ? "bg-primary/10 border-primary/30 text-foreground font-medium"
                  : "border-border text-muted hover:bg-foreground/[0.03]")
              }
              title={Object.entries((v.params ?? {}) as Record<string, string>)
                .filter(([, val]) => val)
                .map(([k, val]) => `${k}=${val}`)
                .join(" · ") || "no filters"}
            >
              {v.label}
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(v)}
              aria-label={`Remove "${v.label}"`}
              className={
                "rounded-r-full px-1.5 py-0.5 border-y border-r transition " +
                (isActive
                  ? "bg-primary/10 border-primary/30 text-foreground hover:text-red-700"
                  : "border-border text-muted/60 hover:bg-foreground/[0.03] hover:text-red-600")
              }
              style={{ borderLeft: 0 }}
            >
              ×
            </button>
          </span>
        );
      })}

      {/* Save current view */}
      {savePopoverOpen ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setSavePopoverOpen(false); setLabel(""); }
            }}
            placeholder="Name this view…"
            className="rounded-md border border-border bg-background px-2 py-0.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary w-44"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !label.trim()}
            className="rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => { setSavePopoverOpen(false); setLabel(""); }}
            className="text-muted hover:text-foreground text-xs px-1"
          >
            ✕
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => {
            // Don't prompt to save an empty-filter view.
            if (currentParamsString === "{}") {
              toast.info("Apply some filters first, then save the view.");
              return;
            }
            setSavePopoverOpen(true);
          }}
          className="rounded-full px-2.5 py-0.5 border border-dashed border-border text-muted hover:bg-foreground/[0.03] hover:text-foreground transition"
        >
          + Save current
        </button>
      )}

      {/* Quietly silence the router import (used by future jumpTo actions) */}
      <span className="hidden">{router ? "" : ""}</span>
    </div>
  );
}
