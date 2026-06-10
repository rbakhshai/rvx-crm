"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  claimNextLeadAction,
  correctLeadContactAction,
  dispositionLeadAction,
  releaseLeadAction,
  type ClaimMode,
} from "@/app/actions/leads";

type Lead = {
  id: string;
  parkName: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  pads: number | null;
  source: string | null;
  importedNotes: string | null;
  callAttempts: number;
  /** How many times any BD has flagged this lead's phone as wrong. */
  wrongNumberCount: number;
};

type DispositionKey =
  | "no_answer"
  | "voicemail"
  | "busy"
  | "wrong_number"
  | "connected_interested"
  | "connected_not_selling"
  | "connected_thinking"
  | "connected_selling_to_family"
  | "connected_future_maybe"
  | "connected_manager_only"
  | "qualified"
  | "do_not_call";

const RECYCLE: Array<{ key: DispositionKey; label: string; icon: string; sub?: string }> = [
  { key: "no_answer",     label: "No answer",     icon: "📞", sub: "Recycles to pool" },
  { key: "voicemail",     label: "Voicemail",     icon: "📩", sub: "Recycles to pool" },
  { key: "busy",          label: "Busy",          icon: "📵", sub: "Recycles to pool" },
  { key: "wrong_number",  label: "Wrong number",  icon: "❌", sub: "Recycles to pool" },
];

// Buttons ordered hottest → coldest so the BD's eye lands on the
// "I just had a real conversation" pile at the top of the column.
const CONNECTED: Array<{ key: DispositionKey; label: string; icon: string; sub?: string }> = [
  { key: "connected_interested",        label: "Interested",          icon: "🔥", sub: "Follow up in 7d" },
  { key: "connected_manager_only",      label: "Manager only",        icon: "📤", sub: "Awaiting pass-through · 7d" },
  { key: "connected_thinking",          label: "Thinking about it",   icon: "💭", sub: "Follow up in 14d" },
  { key: "connected_not_selling",       label: "Not selling now",     icon: "🤷", sub: "Follow up in 30d" },
  { key: "connected_future_maybe",      label: "Future maybe",        icon: "🌱", sub: "Follow up in 90d" },
  { key: "connected_selling_to_family", label: "Selling to family",   icon: "👨‍👩‍👧", sub: "Follow up in 90d" },
];

const TERMINAL: Array<{ key: DispositionKey; label: string; icon: string; sub: string; tone: "good" | "bad" }> = [
  { key: "qualified",   label: "Qualified — hand to closer",  icon: "✅", sub: "Creates a deal", tone: "good" },
  { key: "do_not_call", label: "DNC — never call again",      icon: "🚫", sub: "Marks dead",     tone: "bad" },
];

export function BdTriageClient({
  mode,
  initialLead,
  freshCount,
  followupCount,
  callsToday,
}: {
  mode: ClaimMode;
  initialLead: Lead | null;
  freshCount: number;
  followupCount: number;
  callsToday: number;
}) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(initialLead);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  // Convenience — single number for the current mode's queue.
  const queueSize = mode === "fresh" ? freshCount : followupCount;

  function getNext() {
    startTransition(async () => {
      try {
        const r = await claimNextLeadAction(mode);
        if (!r.ok) {
          toast.error(r.error ?? "Couldn't get a lead");
          return;
        }
        if (r.poolEmpty || !r.leadId) {
          toast(
            mode === "fresh"
              ? "No fresh leads — pool's empty for you."
              : "No follow-ups due — nothing to call back right now.",
            { icon: "🌅" },
          );
          setLead(null);
          return;
        }
        router.refresh();
      } catch (e) {
        toast.error("Couldn't get a lead", { description: e instanceof Error ? e.message : "Try again" });
      }
    });
  }

  function disposition(outcome: DispositionKey) {
    if (!lead) return;
    startTransition(async () => {
      try {
        const r = await dispositionLeadAction({ leadId: lead.id, outcome, notes });
        if (!r.ok) {
          toast.error(r.error ?? "Couldn't save");
          return;
        }
        setNotes("");

        // What happens next:
        //   recycled / dead → auto-grab the next lead in the same mode
        //   converted       → same as recycled, plus celebrate
        if (r.next === "converted") {
          toast.success("Sent to closer triage 🎉");
        } else if (r.next === "dead") {
          toast.success("Marked DNC — getting next…");
        } else {
          toast.success("Logged — getting next…");
        }

        const claim = await claimNextLeadAction(mode);
        if (claim.poolEmpty) {
          toast(
            mode === "fresh"
              ? "No more fresh leads!"
              : "No more follow-ups due — nice work!",
            { icon: "🌅" },
          );
          setLead(null);
        }
        router.refresh();
      } catch (e) {
        toast.error("Couldn't save", { description: e instanceof Error ? e.message : "Try again" });
      }
    });
  }

  /**
   * Persist a contact-field edit (phone or email). Optimistically
   * patches the local lead so the field shows the new value
   * immediately; on save, we router.refresh() to pick up the canonical
   * row (and the recomputed wrongNumberCount).
   */
  function saveContact(updates: { ownerPhone?: string | null; ownerEmail?: string | null }) {
    if (!lead) return;
    // Optimistic — show the new value right away.
    setLead({
      ...lead,
      ...(updates.ownerPhone !== undefined && { ownerPhone: updates.ownerPhone }),
      ...(updates.ownerEmail !== undefined && { ownerEmail: updates.ownerEmail }),
    });
    startTransition(async () => {
      const r = await correctLeadContactAction(lead.id, updates);
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't save");
        return;
      }
      toast.success("Updated");
      router.refresh();
    });
  }

  function skip() {
    if (!lead) return;
    if (!confirm("Skip this lead without calling? It goes back to the pool for someone else.")) return;
    startTransition(async () => {
      try {
        await releaseLeadAction(lead.id);
        toast.success("Released — getting next…");
        await claimNextLeadAction();
        router.refresh();
      } catch {
        toast.error("Couldn't release");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="inline-flex rounded-full border border-border bg-background p-1">
        <ModeChip mode="fresh"    active={mode === "fresh"}    count={freshCount}    />
        <ModeChip mode="followup" active={mode === "followup"} count={followupCount} />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label={mode === "fresh" ? "Fresh available" : "Follow-ups due"} value={queueSize} hint="ready to claim" />
        <Stat label="Your calls today" value={callsToday} hint="across all leads" />
        <Stat
          label="This lead's attempts"
          value={lead?.callAttempts ?? "—"}
          hint={lead ? "logged before today" : "no lead claimed"}
        />
      </div>

      {!lead ? (
        <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center">
          <div className="text-4xl mb-3">{mode === "fresh" ? "📞" : "🔁"}</div>
          <h2 className="text-base font-semibold mb-2">
            {mode === "fresh" ? "No fresh lead claimed" : "No follow-up claimed"}
          </h2>
          <p className="text-sm text-muted mb-5">
            {queueSize > 0
              ? `${queueSize} ${mode === "fresh" ? "fresh leads" : "follow-ups"} waiting.`
              : mode === "fresh"
              ? "No fresh leads left. Try Follow-up mode if you have callbacks due."
              : "No follow-ups due — go work fresh leads or wait for new uploads."}
          </p>
          <button
            type="button"
            onClick={getNext}
            disabled={isPending || queueSize === 0}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {isPending ? "Getting…" : mode === "fresh" ? "Get next fresh lead →" : "Get next follow-up →"}
          </button>
        </div>
      ) : (
        <>
          {/* Lead card */}
          <section className="rounded-xl border border-border bg-background p-5">
            <header className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold tracking-tight">
                  {lead.parkName ?? "(unnamed park)"}
                </h2>
                <p className="text-sm text-muted mt-0.5">
                  {[lead.street, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ") || "no address"}
                </p>
              </div>
              <button
                type="button"
                onClick={skip}
                disabled={isPending}
                className="text-xs text-muted hover:text-foreground hover:underline shrink-0"
                title="Release this lead back to the pool"
              >
                Skip
              </button>
            </header>

            {lead.wrongNumberCount > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 px-3 py-2 mb-3 flex items-center justify-between gap-3 text-xs">
                <span>
                  ⚠️ <strong>Heads up:</strong> this number was flagged as wrong by{" "}
                  {lead.wrongNumberCount} prior {lead.wrongNumberCount === 1 ? "BD" : "BDs"}.
                  If you find the right number, edit the field on the right.
                </span>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-4 text-sm">
              <Field label="Owner" value={lead.ownerName} />
              <EditableContactField
                label="Phone"
                value={lead.ownerPhone}
                placeholder="(555) 123-4567"
                hrefScheme="tel"
                onSave={(next) => saveContact({ ownerPhone: next })}
              />
              <EditableContactField
                label="Email"
                value={lead.ownerEmail}
                placeholder="owner@example.com"
                hrefScheme="mailto"
                onSave={(next) => saveContact({ ownerEmail: next })}
              />
              <Field label="Pads" value={lead.pads} />
              <Field label="Source" value={lead.source} />
            </dl>

            {lead.importedNotes && (
              <div className="rounded-lg border border-border bg-foreground/[0.02] p-3 mb-4">
                <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-1">
                  Imported notes
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{lead.importedNotes}</p>
              </div>
            )}

            {/* Notes textarea */}
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">
                Call notes (saved with disposition)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="What happened on the call?"
                className="mt-1 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
          </section>

          {/* Disposition buttons */}
          <section className="space-y-4">
            <DispositionGroup label="No connect (recycles to pool)" buttons={RECYCLE} onClick={disposition} disabled={isPending} cols={4} />
            <DispositionGroup label="Connected — pick the closest match" buttons={CONNECTED} onClick={disposition} disabled={isPending} cols={3} />
            <DispositionGroup label="Final outcome" buttons={TERMINAL.map((t) => ({ ...t }))} onClick={disposition} disabled={isPending} terminal />
          </section>
        </>
      )}
    </div>
  );
}

function ModeChip({ mode, active, count }: { mode: ClaimMode; active: boolean; count: number }) {
  return (
    <Link
      href={mode === "fresh" ? "/bd-triage" : "/bd-triage?mode=followup"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs transition",
        active
          ? "bg-foreground text-background font-semibold"
          : "text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04]",
      )}
    >
      <span>{mode === "fresh" ? "Fresh" : "Follow-ups"}</span>
      <span
        className={cn(
          "tabular-nums rounded-full px-1.5 text-[10px] font-medium",
          active
            ? "bg-background/20 text-background"
            : "bg-foreground/[0.08] text-foreground/70",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-0.5">{label}</div>
      <div className="text-[10px] text-muted mt-0.5">{hint}</div>
    </div>
  );
}

/**
 * Inline-editable phone or email field. Renders as a click-to-call /
 * mailto link by default; click ✏️ to swap in an input + Save/Cancel
 * controls. Empty-string save clears the field.
 */
function EditableContactField({
  label,
  value,
  placeholder,
  hrefScheme,
  onSave,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  hrefScheme: "tel" | "mailto";
  onSave: (next: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function commit() {
    const trimmed = draft.trim();
    onSave(trimmed.length === 0 ? null : trimmed);
    setEditing(false);
  }

  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</dt>
      <dd className="mt-0.5">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type={hrefScheme === "tel" ? "tel" : "email"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commit(); }
                if (e.key === "Escape") { e.preventDefault(); setDraft(value ?? ""); setEditing(false); }
              }}
              placeholder={placeholder}
              className="flex-1 min-w-0 rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={commit}
              className="rounded bg-primary text-primary-foreground px-2 py-1 text-xs font-medium hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setDraft(value ?? ""); setEditing(false); }}
              className="text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            {value ? (
              <a
                href={
                  hrefScheme === "tel"
                    ? `tel:${value.replace(/[^\d+]/g, "")}`
                    : `mailto:${value}`
                }
                className={cn(
                  hrefScheme === "tel" && "text-primary font-medium",
                  "hover:underline",
                )}
              >
                {value}
                {hrefScheme === "tel" && " ↗"}
              </a>
            ) : (
              <span className="text-muted italic">—</span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[11px] text-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition"
              title={`Correct ${label.toLowerCase()}`}
            >
              ✏️
            </button>
          </div>
        )}
      </dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</dt>
      <dd className="mt-0.5">{value == null || value === "" ? <span className="text-muted">—</span> : value}</dd>
    </div>
  );
}

function DispositionGroup({
  label,
  buttons,
  onClick,
  disabled,
  terminal,
  cols,
}: {
  label: string;
  buttons: Array<{ key: DispositionKey; label: string; icon: string; sub?: string; tone?: "good" | "bad" }>;
  onClick: (k: DispositionKey) => void;
  disabled: boolean;
  terminal?: boolean;
  /** Wide-screen column count (mobile is always 2). 3 for the 6
   *  connected outcomes; 4 for the 4 recycle outcomes. */
  cols?: 3 | 4;
}) {
  const colClass =
    terminal ? "grid-cols-2" :
    cols === 3 ? "grid-cols-2 sm:grid-cols-3" :
    "grid-cols-2 sm:grid-cols-4";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">{label}</div>
      <div className={cn("grid gap-2", colClass)}>
        {buttons.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => onClick(b.key)}
            disabled={disabled}
            className={cn(
              "rounded-md border px-3 py-2.5 text-left transition disabled:opacity-50",
              b.tone === "good" && "border-emerald-300/60 bg-emerald-50/40 hover:bg-emerald-50 dark:bg-emerald-500/[0.06] dark:hover:bg-emerald-500/[0.12]",
              b.tone === "bad" && "border-rose-300/60 bg-rose-50/40 hover:bg-rose-50 dark:bg-rose-500/[0.06] dark:hover:bg-rose-500/[0.12]",
              !b.tone && "border-border bg-background hover:bg-foreground/[0.04]",
            )}
          >
            <div className="text-sm font-medium">
              <span className="mr-1.5">{b.icon}</span>
              {b.label}
            </div>
            {b.sub && <div className="text-[10px] text-muted mt-0.5">{b.sub}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
