"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  claimNextLeadAction,
  dispositionLeadAction,
  releaseLeadAction,
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
};

type DispositionKey =
  | "no_answer"
  | "voicemail"
  | "busy"
  | "wrong_number"
  | "connected_interested"
  | "connected_not_selling"
  | "connected_thinking"
  | "qualified"
  | "do_not_call";

const RECYCLE: Array<{ key: DispositionKey; label: string; icon: string; sub?: string }> = [
  { key: "no_answer",     label: "No answer",     icon: "📞", sub: "Recycles to pool" },
  { key: "voicemail",     label: "Voicemail",     icon: "📩", sub: "Recycles to pool" },
  { key: "busy",          label: "Busy",          icon: "📵", sub: "Recycles to pool" },
  { key: "wrong_number",  label: "Wrong number",  icon: "❌", sub: "Recycles to pool" },
];

const CONNECTED: Array<{ key: DispositionKey; label: string; icon: string }> = [
  { key: "connected_interested",  label: "Connected — Interested",  icon: "🔥" },
  { key: "connected_not_selling", label: "Connected — Not selling", icon: "🤷" },
  { key: "connected_thinking",    label: "Connected — Thinking",    icon: "💭" },
];

const TERMINAL: Array<{ key: DispositionKey; label: string; icon: string; sub: string; tone: "good" | "bad" }> = [
  { key: "qualified",   label: "Qualified — hand to closer",  icon: "✅", sub: "Creates a deal", tone: "good" },
  { key: "do_not_call", label: "DNC — never call again",      icon: "🚫", sub: "Marks dead",     tone: "bad" },
];

export function BdTriageClient({
  initialLead,
  poolCount,
  callsToday,
}: {
  initialLead: Lead | null;
  poolCount: number;
  callsToday: number;
}) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(initialLead);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function getNext() {
    startTransition(async () => {
      try {
        const r = await claimNextLeadAction();
        if (!r.ok) {
          toast.error(r.error ?? "Couldn't get a lead");
          return;
        }
        if (r.poolEmpty || !r.leadId) {
          toast("Pool's empty — nothing to call right now.", { icon: "🌅" });
          setLead(null);
          return;
        }
        // Force a server refresh so the just-claimed lead loads into the
        // page through the normal server query path (single source of
        // truth — avoids drift between client state and DB).
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

        // What happens next depends on the disposition:
        //   recycled / dead → auto-grab the next lead
        //   converted       → toast + auto-grab next (BD keeps grinding)
        //   kept_claimed    → stay on this lead, refresh to update attempts
        if (r.next === "recycled" || r.next === "dead") {
          toast.success("Logged — getting next…");
          await claimNextLeadAction().then((claim) => {
            if (claim.poolEmpty) {
              toast("Pool's empty — that was the last one!", { icon: "🌅" });
              setLead(null);
            }
            router.refresh();
          });
        } else if (r.next === "converted") {
          toast.success("Sent to closer triage 🎉");
          await claimNextLeadAction().then((claim) => {
            if (claim.poolEmpty) {
              toast("Pool's empty — well done!", { icon: "🌅" });
              setLead(null);
            }
            router.refresh();
          });
        } else {
          // kept_claimed
          toast.success("Logged");
          router.refresh();
        }
      } catch (e) {
        toast.error("Couldn't save", { description: e instanceof Error ? e.message : "Try again" });
      }
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
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="In pool" value={poolCount} hint="ready to claim" />
        <Stat label="Your calls today" value={callsToday} hint="across all leads" />
        <Stat
          label="This lead's attempts"
          value={lead?.callAttempts ?? "—"}
          hint={lead ? "logged before today" : "no lead claimed"}
        />
      </div>

      {!lead ? (
        <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center">
          <div className="text-4xl mb-3">📞</div>
          <h2 className="text-base font-semibold mb-2">No lead claimed</h2>
          <p className="text-sm text-muted mb-5">
            {poolCount > 0
              ? `${poolCount} leads in the pool waiting to be worked.`
              : "Pool is empty. Wait for an admin to upload more leads."}
          </p>
          <button
            type="button"
            onClick={getNext}
            disabled={isPending || poolCount === 0}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {isPending ? "Getting…" : "Get next lead →"}
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

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-4 text-sm">
              <Field label="Owner" value={lead.ownerName} />
              <Field
                label="Phone"
                value={
                  lead.ownerPhone ? (
                    <a href={`tel:${lead.ownerPhone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline font-medium">
                      {lead.ownerPhone} ↗
                    </a>
                  ) : null
                }
              />
              <Field
                label="Email"
                value={
                  lead.ownerEmail ? (
                    <a href={`mailto:${lead.ownerEmail}`} className="hover:underline">
                      {lead.ownerEmail}
                    </a>
                  ) : null
                }
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
            <DispositionGroup label="No connect (recycles to pool)" buttons={RECYCLE} onClick={disposition} disabled={isPending} />
            <DispositionGroup label="Connected" buttons={CONNECTED} onClick={disposition} disabled={isPending} />
            <DispositionGroup label="Final outcome" buttons={TERMINAL.map((t) => ({ ...t }))} onClick={disposition} disabled={isPending} terminal />
          </section>
        </>
      )}
    </div>
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
}: {
  label: string;
  buttons: Array<{ key: DispositionKey; label: string; icon: string; sub?: string; tone?: "good" | "bad" }>;
  onClick: (k: DispositionKey) => void;
  disabled: boolean;
  terminal?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">{label}</div>
      <div className={cn("grid gap-2", terminal ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
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
