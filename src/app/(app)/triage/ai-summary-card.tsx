"use client";

import { useState, useTransition } from "react";
import { generateDealSummaryAction } from "./ai-summary-action";

/**
 * Minimal markdown → HTML for the summary. Supports:
 *   **bold**, *italic*, line breaks, "—" stays.
 * Anything more complex stays as plain text.
 */
function renderMarkdown(md: string): string {
  // Escape HTML first
  const esc = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Bold
  let out = esc.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic (single *)
  out = out.replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1<em>$2</em>');
  // Line breaks → <br>
  out = out.replace(/\n/g, "<br/>");
  return out;
}

export function AiSummaryCard({
  dealId,
  initialSummary,
}: {
  dealId: string;
  initialSummary: string | null;
}) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateDealSummaryAction(dealId);
      if (result.ok) {
        setSummary(result.summary);
      } else {
        setError(result.message);
      }
    });
  }

  if (!summary && !isPending) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-gradient-to-br from-foreground/[0.02] to-transparent p-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold flex items-center gap-2">
            <span>🤖</span>
            <span>AI deal summary</span>
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            3-bullet brief synthesized from the lead data. Generates in ~3 seconds.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          className="shrink-0 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90"
        >
          Generate summary
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200/70 bg-gradient-to-br from-amber-50/60 to-transparent p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-sm font-semibold flex items-center gap-2">
          <span>🤖</span>
          <span>AI summary</span>
          {isPending && (
            <span className="text-[10px] uppercase tracking-widest text-amber-800 font-medium animate-pulse">
              generating…
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={isPending}
          className="shrink-0 text-[11px] text-muted hover:text-foreground disabled:opacity-50"
          title="Regenerate using the latest deal data"
        >
          {isPending ? "…" : "↻ Regenerate"}
        </button>
      </div>

      {summary && (
        <div
          className="text-[13px] leading-relaxed text-foreground/90 [&_strong]:text-foreground"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
        />
      )}

      {error && (
        <p className="mt-2 text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
