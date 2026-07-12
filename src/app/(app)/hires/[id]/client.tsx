"use client";

/**
 * Hire-request detail UI: stepper + inline-editable sections +
 * workflow buttons (Advance / Send back / Withdraw).
 *
 * Editable fields autosave on blur via updateHireRequestAction.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useConfirmDialog } from "@/components/confirm-dialog";
import {
  updateHireRequestAction,
  advanceHireStatusAction,
  reverseHireStatusAction,
  withdrawHireAction,
} from "@/app/actions/hires";

type Row = {
  id: string;
  candidateName: string;
  candidateEmail: string | null;
  candidatePhone: string | null;
  type: string;
  status: string;
  forUnit: string | null;
  roleTitle: string | null;
  rolesAndDuties: string | null;
  financeNotes: string | null;
  founderNotes: string | null;
  requesterFinalNotes: string | null;
  finalizedAt: string | null;
  withdrawnAt: string | null;
  withdrawnReason: string | null;
};

// Active flow excludes withdrawn — that's a kill switch, not a step.
const FLOW = ["draft", "finance_review", "founder_review", "requester_review", "finalized"] as const;

const STEP_META: Record<(typeof FLOW)[number], { label: string; owner: string }> = {
  draft:             { label: "Draft",          owner: "Requester" },
  finance_review:    { label: "Finance review", owner: "Kevin" },
  founder_review:    { label: "Founder review", owner: "Reza" },
  requester_review:  { label: "Final remarks",  owner: "Requester" },
  finalized:         { label: "Finalized",      owner: "—" },
};

const TYPE_LABEL: Record<string, string> = {
  employee: "Employee",
  contractor_1099: "1099 contractor",
  vendor: "Vendor",
};

export function HireDetailClient({ row, canManage }: { row: Row; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const dialog = useConfirmDialog();

  const stepIdx = (FLOW as readonly string[]).indexOf(row.status);
  const isWithdrawn = row.status === "withdrawn";
  const isFinalized = row.status === "finalized";

  function save<K extends keyof Row>(field: K, value: Row[K]) {
    startTransition(async () => {
      const r = await updateHireRequestAction(row.id, { [field]: value } as never);
      if (!r.ok) {
        toast.error(r.error ?? "Save failed");
        return;
      }
      router.refresh();
    });
  }

  function advance() {
    startTransition(async () => {
      const r = await advanceHireStatusAction(row.id);
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't advance");
        return;
      }
      toast.success("Advanced");
      router.refresh();
    });
  }

  function sendBack() {
    dialog.ask({
      title: "Send back one step?",
      body: "The previous reviewer will see this in their queue.",
      confirmLabel: "Send back",
      onConfirm: () =>
        startTransition(async () => {
          const r = await reverseHireStatusAction(row.id);
          if (!r.ok) {
            toast.error(r.error ?? "Couldn't reverse");
            return;
          }
          toast.success("Sent back");
          router.refresh();
        }),
    });
  }

  function withdraw() {
    dialog.ask({
      title: "Withdraw this request?",
      body: "The reason is saved on the record.",
      confirmLabel: "Withdraw",
      danger: true,
      input: { label: "Reason", placeholder: "Why are we withdrawing?", required: true },
      onConfirm: (reason) =>
        startTransition(async () => {
          await withdrawHireAction(row.id, reason);
          toast.success("Withdrawn");
          router.refresh();
        }),
    });
  }

  return (
    <div className="space-y-6">
      {dialog.node}
      {/* Stepper */}
      {!isWithdrawn && (
        <ol className="flex items-center gap-2 flex-wrap rounded-xl border border-border bg-foreground/[0.02] p-3">
          {FLOW.map((s, i) => {
            const meta = STEP_META[s];
            const done = i < stepIdx;
            const current = i === stepIdx;
            return (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                    current && "bg-foreground text-background border-foreground font-semibold",
                    done && !current && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
                    !current && !done && "bg-background border-border text-muted",
                  )}
                >
                  <span>{i + 1}.</span>
                  <span>{meta.label}</span>
                  {current && <span className="text-[10px] opacity-70 ml-1">({meta.owner})</span>}
                </span>
                {i < FLOW.length - 1 && <span className="text-muted">→</span>}
              </li>
            );
          })}
        </ol>
      )}

      {isWithdrawn && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10 px-4 py-3 text-sm">
          <div className="font-semibold text-rose-800 dark:text-rose-200 mb-0.5">Withdrawn</div>
          {row.withdrawnReason && <div className="text-rose-900/80 dark:text-rose-200/80">{row.withdrawnReason}</div>}
        </div>
      )}

      {/* Candidate panel */}
      <Section title="Candidate">
        <Grid>
          <EditableField label="Name" value={row.candidateName} onSave={(v) => v && save("candidateName", v)} disabled={!canManage} />
          <EditableField label="Email" value={row.candidateEmail} onSave={(v) => save("candidateEmail", v)} disabled={!canManage} placeholder="(not provided)" />
          <EditableField label="Phone" value={row.candidatePhone} onSave={(v) => save("candidatePhone", v)} disabled={!canManage} placeholder="(not provided)" />
          <div>
            <Label>Type</Label>
            {canManage ? (
              <select
                defaultValue={row.type}
                onChange={(e) => save("type", e.target.value as Row["type"])}
                className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1.5 text-sm cursor-pointer"
              >
                <option value="contractor_1099">1099 contractor</option>
                <option value="employee">Employee</option>
                <option value="vendor">Vendor</option>
              </select>
            ) : (
              <div className="mt-0.5 text-sm">{TYPE_LABEL[row.type] ?? row.type}</div>
            )}
          </div>
          <EditableField label="Role title" value={row.roleTitle} onSave={(v) => save("roleTitle", v)} disabled={!canManage} placeholder="(no title)" />
          <EditableField label="For unit / park" value={row.forUnit} onSave={(v) => save("forUnit", v)} disabled={!canManage} placeholder="(none)" />
        </Grid>
      </Section>

      {/* Roles & duties */}
      <Section title="Roles & duties" subtitle="What this person actually does. Schedule, location, comp range — anything Kevin or Reza need.">
        <EditableTextarea
          value={row.rolesAndDuties}
          onSave={(v) => save("rolesAndDuties", v)}
          disabled={!canManage}
          rows={8}
          placeholder="• Trail rides — guide horse rides with customers&#10;• Trail maintenance — clearing trees, branches&#10;• Off Mon/Tue. Lives on property.&#10;• …"
        />
      </Section>

      {/* Finance notes — Kevin's pass */}
      <Section
        title="Finance / tax / legal notes"
        subtitle="Kevin's review: comp structure, tax classification, contract clauses, risks."
        accent="blue"
      >
        <EditableTextarea
          value={row.financeNotes}
          onSave={(v) => save("financeNotes", v)}
          disabled={!canManage}
          rows={6}
          placeholder="Kevin fills this in during the Finance review step."
        />
      </Section>

      {/* Founder notes — Reza's pass */}
      <Section
        title="Founder review"
        subtitle="Reza's review: company effects, clauses, risks, anything off-pattern."
        accent="violet"
      >
        <EditableTextarea
          value={row.founderNotes}
          onSave={(v) => save("founderNotes", v)}
          disabled={!canManage}
          rows={6}
          placeholder="Reza fills this in after Finance signs off."
        />
      </Section>

      {/* Requester final remarks */}
      <Section
        title="Final remarks (back to requester)"
        subtitle="Anything the requester wants to flag before finalizing — last chance to push back."
        accent="amber"
      >
        <EditableTextarea
          value={row.requesterFinalNotes}
          onSave={(v) => save("requesterFinalNotes", v)}
          disabled={!canManage}
          rows={5}
          placeholder="Requester fills this in last before we finalize the contract."
        />
      </Section>

      {/* Workflow buttons */}
      {canManage && !isWithdrawn && (
        <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {stepIdx > 0 && !isFinalized && (
              <button
                type="button"
                onClick={sendBack}
                disabled={pending}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-foreground/[0.04] transition disabled:opacity-50"
              >
                ← Send back one step
              </button>
            )}
            <button
              type="button"
              onClick={withdraw}
              disabled={pending}
              className="rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-1.5 text-sm hover:bg-rose-100 transition disabled:opacity-50 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
            >
              Withdraw request
            </button>
          </div>
          {!isFinalized && (
            <button
              type="button"
              onClick={advance}
              disabled={pending}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {pending ? "Saving…" : nextLabel(row.status)}
            </button>
          )}
          {isFinalized && (
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              ✓ Finalized — contract is ready to send to the candidate.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function nextLabel(status: string): string {
  switch (status) {
    case "draft":             return "Submit to Finance →";
    case "finance_review":    return "Send to Founder review →";
    case "founder_review":    return "Send to requester for final remarks →";
    case "requester_review":  return "Finalize →";
    default:                  return "Advance →";
  }
}

// ============================================================================
// Tiny building blocks
// ============================================================================

function Section({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: "blue" | "violet" | "amber";
  children: React.ReactNode;
}) {
  const ring: Record<string, string> = {
    blue:   "ring-1 ring-blue-200/40 dark:ring-blue-500/[0.08]",
    violet: "ring-1 ring-violet-200/40 dark:ring-violet-500/[0.08]",
    amber:  "ring-1 ring-amber-200/40 dark:ring-amber-500/[0.08]",
  };
  return (
    <section className={cn("rounded-xl border border-border bg-background p-5", accent && ring[accent])}>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10px] uppercase tracking-widest text-muted font-medium">{children}</span>;
}

function EditableField({
  label,
  value,
  onSave,
  disabled,
  placeholder,
}: {
  label: string;
  value: string | null;
  onSave: (v: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [editing, setEditing] = useState(false);
  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "")) onSave(trimmed.length > 0 ? trimmed : null);
    setEditing(false);
  }
  return (
    <div>
      <Label>{label}</Label>
      {editing && !disabled ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
          }}
          className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <button
          type="button"
          onClick={() => !disabled && setEditing(true)}
          disabled={disabled}
          className={cn(
            "mt-0.5 block w-full text-left text-sm rounded px-2 py-1.5 -mx-2 -my-0.5 truncate",
            !disabled && "hover:bg-foreground/[0.04]",
            !value && "text-muted italic",
          )}
        >
          {value ?? placeholder ?? "(empty)"}
        </button>
      )}
    </div>
  );
}

function EditableTextarea({
  value,
  onSave,
  disabled,
  rows,
  placeholder,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "")) onSave(trimmed.length > 0 ? trimmed : null);
  }
  return (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      disabled={disabled}
      rows={rows ?? 5}
      placeholder={placeholder}
      className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 whitespace-pre-wrap"
    />
  );
}
