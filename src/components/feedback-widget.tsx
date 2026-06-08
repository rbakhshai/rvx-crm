"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { cn } from "@/lib/cn";

/**
 * Floating "?" button bottom-right of every authenticated CRM page.
 * Click → opens a small popover with a feature-request / bug-report
 * form. After submit, swaps to a "Thanks!" state for 2 seconds then
 * resets so the user can submit another.
 *
 * Defaults the name + email if a signed-in user is passed in — but the
 * fields stay editable in case the actual submitter is someone else
 * (e.g. logged in as Reza but Erica is the one typing).
 */
export function FeedbackWidget({
  defaultName = "",
  defaultEmail = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"feature" | "bug">("feature");
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset defaults if the parent passes new values (rare, but safe).
  useEffect(() => { setName(defaultName); }, [defaultName]);
  useEffect(() => { setEmail(defaultEmail); }, [defaultEmail]);

  // Close on Esc when the panel is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("kind", kind);
    fd.set("body", body);

    startTransition(async () => {
      const r = await submitFeedbackAction(fd);
      if (!r.ok) {
        setError(r.error ?? "Couldn't send");
        return;
      }
      setThanks(true);
      setBody("");
      window.setTimeout(() => {
        setThanks(false);
        setOpen(false);
      }, 2200);
    });
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Send feedback"
        title="Send feedback"
        className={cn(
          "fixed bottom-5 right-5 z-30 size-12 rounded-full shadow-lg transition",
          "bg-foreground text-background hover:opacity-90",
          "grid place-items-center text-xl font-bold leading-none",
        )}
      >
        {open ? "×" : "?"}
      </button>

      {/* Popover panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-20 right-5 z-30 w-[360px] max-w-[calc(100vw-2.5rem)] rounded-xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
          role="dialog"
          aria-modal="false"
          aria-label="Feedback"
        >
          {thanks ? (
            <div className="px-5 py-8 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm font-semibold">Thanks!</p>
              <p className="text-xs text-muted mt-1">Reza + Erica will see this in the admin queue.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="p-4 space-y-3">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Send feedback</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted hover:text-foreground text-xs"
                  aria-label="Close"
                >
                  esc
                </button>
              </header>

              {/* Type buttons */}
              <div className="grid grid-cols-2 gap-2">
                <KindButton
                  active={kind === "feature"}
                  onClick={() => setKind("feature")}
                  icon="✨"
                  label="Request a feature"
                />
                <KindButton
                  active={kind === "bug"}
                  onClick={() => setKind("bug")}
                  icon="🐛"
                  label="Report a bug"
                />
              </div>

              {/* Name + Email */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Body */}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder={
                  kind === "feature"
                    ? "What would you like us to build?"
                    : "What's broken? Steps to reproduce help a ton."
                }
                required
                className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />

              {/* Error */}
              {error && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
              )}

              {/* Submit row */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-muted">
                  Goes straight to the admin queue.
                </p>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {isPending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}

function KindButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-2 text-xs font-medium transition text-left",
        active
          ? "border-primary bg-primary/[0.08] text-foreground"
          : "border-border bg-background text-foreground/70 hover:bg-foreground/[0.04]",
      )}
    >
      <span className="text-base mr-1.5">{icon}</span>
      {label}
    </button>
  );
}
