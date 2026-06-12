"use client";

/**
 * Leadership announcement composer + manage list for /bd-team.
 * Posts land on every BD's Today hub instantly (spec Phase 4).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { postAnnouncementAction, deleteAnnouncementAction } from "@/app/actions/announcements";
import { fmtRelative } from "@/lib/date-format";

export function AnnouncementsManager({
  items,
}: {
  items: Array<{ id: string; body: string; authorName: string; createdAt: string }>;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function post() {
    startTransition(async () => {
      const r = await postAnnouncementAction(body);
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't post");
        return;
      }
      setBody("");
      toast.success("Posted — every BD sees it on Today");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Remove this announcement for everyone?")) return;
    startTransition(async () => {
      const r = await deleteAnnouncementAction(id);
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't remove");
        return;
      }
      toast.success("Removed");
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-background p-4 mb-6">
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">
        📣 Announcements — visible to every BD on their Today page
      </div>
      <div className="flex items-start gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Post an update for the bird-dog team…"
          className="flex-1 resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={post}
          disabled={isPending || body.trim().length < 3}
          className="rounded-md bg-foreground text-background px-3.5 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition shrink-0"
        >
          {isPending ? "Posting…" : "Post"}
        </button>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {items.map((a) => (
            <li key={a.id} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground/90 whitespace-pre-line leading-snug">{a.body}</p>
                <div className="text-[11px] text-muted mt-0.5">
                  {a.authorName} · {fmtRelative(a.createdAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(a.id)}
                disabled={isPending}
                className="text-[11px] text-muted hover:text-rose-600 shrink-0"
                title="Remove announcement"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
