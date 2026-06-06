"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { regenerateDailyBriefAction } from "@/app/actions/daily-brief";

/**
 * Renders Claude's morning brief at the top of /today, with a refresh
 * button that regenerates it (rate-limited by ANTHROPIC_API_KEY being set).
 *
 * Brief is server-rendered, so reaching this component already means
 * today's brief is in the DB. The refresh action is the only interaction.
 */
export function DailyBrief({
  contentMd,
  createdAt,
}: {
  contentMd: string;
  createdAt: Date | string;
}) {
  const [isPending, startTransition] = useTransition();
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;

  function refresh() {
    startTransition(async () => {
      try {
        await regenerateDailyBriefAction();
        toast.success("Brief refreshed");
      } catch (e) {
        toast.error("Couldn't refresh", {
          description: e instanceof Error ? e.message : "Try again.",
        });
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-gradient-to-br from-foreground/[0.03] to-foreground/[0.01] p-5 mb-6">
      <header className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-foreground/10 text-[14px]">
            ✨
          </span>
          <h2 className="text-sm font-semibold">Morning brief</h2>
          <span className="text-[11px] text-muted">· generated {timeAgo(created)} by Claude</span>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isPending}
          className="text-xs text-muted hover:text-foreground transition inline-flex items-center gap-1 disabled:opacity-50"
          aria-label="Regenerate brief"
        >
          <svg viewBox="0 0 16 16" className={"size-3.5 " + (isPending ? "animate-spin" : "")} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 8a6 6 0 1 1-1.76-4.24" />
            <path d="M14 2v4h-4" />
          </svg>
          {isPending ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div className="prose prose-sm max-w-none text-[13.5px] leading-relaxed text-foreground">
        <MarkdownBlock text={contentMd} />
      </div>
    </section>
  );
}

function timeAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

/**
 * Tiny markdown renderer — just bold (**...**), italics (_..._), bullets,
 * and paragraphs. Enough for the brief format we constrain Claude to.
 */
function MarkdownBlock({ text }: { text: string }) {
  // Split on lines, render bullets and paragraphs.
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let buf: string[] = [];

  function flush(kind: "p" | "ul") {
    if (buf.length === 0) return;
    if (kind === "ul") {
      out.push(
        <ul key={`ul-${out.length}`} className="list-disc list-outside pl-5 space-y-1.5 my-2">
          {buf.map((b, i) => <li key={i}>{inline(b)}</li>)}
        </ul>,
      );
    } else {
      out.push(<p key={`p-${out.length}`} className="my-2">{inline(buf.join(" "))}</p>);
    }
    buf = [];
  }

  let mode: "p" | "ul" | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush(mode ?? "p");
      mode = null;
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (mode !== "ul") flush(mode ?? "p");
      mode = "ul";
      buf.push(bullet[1]);
    } else {
      if (mode !== "p") flush(mode ?? "p");
      mode = "p";
      buf.push(line);
    }
  }
  flush(mode ?? "p");

  return <>{out}</>;
}

/** Inline formatting — bold and italic only. */
function inline(s: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < s.length) {
    const bold = s.indexOf("**", i);
    const ital = s.indexOf("_", i);
    const next = [bold, ital].filter((x) => x !== -1).sort((a, b) => a - b)[0];
    if (next === undefined) {
      parts.push(s.slice(i));
      break;
    }
    if (next > i) parts.push(s.slice(i, next));
    if (s.slice(next, next + 2) === "**") {
      const end = s.indexOf("**", next + 2);
      if (end === -1) { parts.push(s.slice(next)); break; }
      parts.push(<strong key={key++}>{s.slice(next + 2, end)}</strong>);
      i = end + 2;
    } else {
      const end = s.indexOf("_", next + 1);
      if (end === -1) { parts.push(s.slice(next)); break; }
      parts.push(<em key={key++}>{s.slice(next + 1, end)}</em>);
      i = end + 1;
    }
  }
  return parts;
}
