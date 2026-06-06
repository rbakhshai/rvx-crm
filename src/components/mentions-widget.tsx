"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clearAllMentionsAction, markMentionsReadAction } from "@/app/actions/notes";
import type { OutstandingMention } from "@/lib/mentions";

/**
 * "Your mentions" widget — shows unread @-mentions on a record. Each row
 * is dismissable (mark read) and links to the record via a hard nav so
 * the drawer intercept doesn't swallow the click when used inside one.
 *
 * Used by /today; also by each Today mockup variant.
 */

type SerializableMention = Omit<OutstandingMention, "mentionedAt"> & { mentionedAt: string };

const PARENT_LABEL: Record<SerializableMention["parentTable"], string> = {
  contacts: "Buyer",
  deals: "Deal",
  companies: "Seller",
  bird_dogs: "Bird dog",
  issues: "Issue",
};

const PARENT_PATH: Record<SerializableMention["parentTable"], string> = {
  contacts: "/contacts",
  deals: "/deals",
  companies: "/companies",
  bird_dogs: "/bird-dogs",
  issues: "/issues",
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Pull out the snippet around the @-token so the user sees context, not
 * the whole 500-char note body. Returns ~80 chars centered on the mention.
 */
function snippet(body: string): string {
  const max = 110;
  if (body.length <= max) return body;
  const idx = body.search(/@\w/);
  if (idx < 0) return body.slice(0, max) + "…";
  const start = Math.max(0, idx - 30);
  const end = Math.min(body.length, start + max);
  return (start > 0 ? "…" : "") + body.slice(start, end).trim() + (end < body.length ? "…" : "");
}

export function MentionsWidget({
  mentions,
  variant = "default",
}: {
  mentions: SerializableMention[];
  /** Visual mode — "default" is the standalone card; "compact" drops the card chrome. */
  variant?: "default" | "compact";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  function dismiss(id: string) {
    setHiddenIds((s) => new Set([...s, id]));
    startTransition(async () => {
      try {
        await markMentionsReadAction([id]);
      } catch {
        toast.error("Couldn't dismiss");
        setHiddenIds((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      }
    });
  }

  function clearAll() {
    setHiddenIds(new Set(mentions.map((m) => m.id)));
    startTransition(async () => {
      try {
        await clearAllMentionsAction();
        toast.success("Cleared all mentions");
        router.refresh();
      } catch {
        toast.error("Couldn't clear");
        setHiddenIds(new Set());
      }
    });
  }

  const visible = mentions.filter((m) => !hiddenIds.has(m.id));
  const count = visible.length;

  const list = (
    <>
      {count === 0 ? (
        <div className="py-6 text-center text-xs text-muted">
          You&apos;re all caught up — no outstanding mentions.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((m) => {
            const parentHref = `${PARENT_PATH[m.parentTable]}/${m.parentId}`;
            return (
              <li key={m.id} className="py-2.5 flex items-start gap-3">
                <span
                  className="mt-1 size-1.5 rounded-full bg-primary shrink-0"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 text-[11px] text-muted">
                    <span className="text-foreground/70 font-medium">{m.authorName ?? "Someone"}</span>
                    <span>·</span>
                    <span>{relativeTime(m.mentionedAt)}</span>
                    <span>·</span>
                    <Link href={parentHref as never} className="hover:underline truncate">
                      {PARENT_LABEL[m.parentTable]}
                    </Link>
                  </div>
                  <p className="text-sm text-foreground/85 mt-0.5 leading-relaxed line-clamp-2">
                    {snippet(m.body)}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[11px]">
                    <Link
                      href={parentHref as never}
                      className="text-primary hover:underline"
                    >
                      Open →
                    </Link>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => dismiss(m.id)}
                      className="text-muted hover:text-foreground disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (variant === "compact") return list;

  return (
    <section className="rounded-xl border border-border bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="inline-flex items-center gap-2">
          <h2 className="text-sm font-semibold">Your mentions</h2>
          {count > 0 && (
            <span className="rounded-full bg-primary/15 text-primary text-[10px] font-medium px-1.5">
              {count}
            </span>
          )}
        </div>
        {count > 0 && (
          <button
            type="button"
            disabled={isPending}
            onClick={clearAll}
            className="text-[11px] text-muted hover:text-foreground transition disabled:opacity-50"
          >
            Clear all
          </button>
        )}
      </header>
      <div className="px-4">{list}</div>
    </section>
  );
}
