"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useConfirmDialog } from "@/components/confirm-dialog";
import {
  updateReimbursementAction,
  advanceReimbursementAction,
  declineReimbursementAction,
} from "@/app/actions/reimbursements";
import { fmtDate, fmtDateTime } from "@/lib/date-format";

type Row = {
  id: string;
  parkName: string | null;
  itemDescription: string;
  reason: string | null;
  productUrl: string | null;
  amountCents: number | null;
  neededByIso: string | null;
  status: string;
  declineReason: string | null;
  stamps: {
    requested: string;
    approved: string | null;
    purchased: string | null;
    fulfilled: string | null;
    declined: string | null;
  };
};

const FLOW = ["pending", "approved", "purchased", "fulfilled"] as const;
const STEP_META: Record<(typeof FLOW)[number], { label: string; nextLabel: string }> = {
  pending:   { label: "Pending",   nextLabel: "Approve →" },
  approved:  { label: "Approved",  nextLabel: "Mark purchased →" },
  purchased: { label: "Purchased", nextLabel: "Mark fulfilled →" },
  fulfilled: { label: "Fulfilled", nextLabel: "" },
};

export function ReimbursementDetailClient({ row, canManage }: { row: Row; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const dialog = useConfirmDialog();

  const isDeclined = row.status === "declined";
  const isFulfilled = row.status === "fulfilled";
  const stepIdx = isDeclined ? -1 : (FLOW as readonly string[]).indexOf(row.status);

  function patch<K extends keyof Row>(field: K, value: Row[K]) {
    startTransition(async () => {
      const payload: Record<string, unknown> = {};
      if (field === "neededByIso") payload.neededByIso = value;
      else if (field === "amountCents") payload.amountCents = value;
      else payload[field as string] = value;
      const r = await updateReimbursementAction(row.id, payload as never);
      if (!r.ok) toast.error(r.error ?? "Save failed");
      else router.refresh();
    });
  }

  function advance() {
    startTransition(async () => {
      const r = await advanceReimbursementAction(row.id);
      if (!r.ok) toast.error(r.error ?? "Couldn't advance");
      else { toast.success("Advanced"); router.refresh(); }
    });
  }

  function decline() {
    dialog.ask({
      title: "Decline this request?",
      body: "The reason is saved on the record.",
      confirmLabel: "Decline",
      danger: true,
      input: { label: "Reason", placeholder: "Why is this being declined?", required: true },
      onConfirm: (reason) =>
        startTransition(async () => {
          await declineReimbursementAction(row.id, reason);
          toast.success("Declined");
          router.refresh();
        }),
    });
  }

  return (
    <div className="space-y-6">
      {dialog.node}
      {/* Stepper */}
      {!isDeclined && (
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
                  <span>{i + 1}.</span><span>{meta.label}</span>
                </span>
                {i < FLOW.length - 1 && <span className="text-muted">→</span>}
              </li>
            );
          })}
        </ol>
      )}

      {isDeclined && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10 px-4 py-3 text-sm">
          <div className="font-semibold text-rose-800 dark:text-rose-200 mb-0.5">
            Declined {row.stamps.declined && `· ${fmtDate(row.stamps.declined)}`}
          </div>
          {row.declineReason && <div className="text-rose-900/80 dark:text-rose-200/80">{row.declineReason}</div>}
        </div>
      )}

      {/* Details */}
      <section className="rounded-xl border border-border bg-background p-5">
        <h3 className="text-sm font-bold mb-3">Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditableField label="Item" value={row.itemDescription} onSave={(v) => v && patch("itemDescription", v)} disabled={!canManage} />
          <EditableField label="Park" value={row.parkName} onSave={(v) => patch("parkName", v)} disabled={!canManage} placeholder="(none)" />
          <div>
            <Label>Estimated cost</Label>
            {canManage ? (
              <input
                type="text"
                defaultValue={row.amountCents != null ? (row.amountCents / 100).toFixed(2) : ""}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const num = v ? parseFloat(v.replace(/[^0-9.]/g, "")) : NaN;
                  patch("amountCents", Number.isFinite(num) && num > 0 ? Math.round(num * 100) : null);
                }}
                placeholder="125.00"
                className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <div className="mt-0.5 text-sm">
                {row.amountCents != null ? `$${(row.amountCents / 100).toFixed(2)}` : "—"}
              </div>
            )}
          </div>
          <div>
            <Label>Needed by</Label>
            {canManage ? (
              <input
                type="date"
                defaultValue={row.neededByIso ? row.neededByIso.slice(0, 10) : ""}
                onChange={(e) => patch("neededByIso", e.target.value || null)}
                className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1.5 text-sm cursor-pointer tabular-nums focus:border-primary focus:outline-none"
              />
            ) : (
              <div className="mt-0.5 text-sm">{row.neededByIso ? fmtDate(row.neededByIso) : "—"}</div>
            )}
          </div>
        </div>
      </section>

      {/* Product link */}
      <section className="rounded-xl border border-border bg-background p-5">
        <h3 className="text-sm font-bold mb-3">Product link</h3>
        {canManage ? (
          <input
            type="url"
            defaultValue={row.productUrl ?? ""}
            onBlur={(e) => patch("productUrl", e.target.value.trim() || null)}
            placeholder="https://…"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : row.productUrl ? (
          <a href={row.productUrl} target="_blank" rel="noreferrer noopener" className="text-sm text-primary hover:underline break-all">
            {row.productUrl} ↗
          </a>
        ) : (
          <div className="text-sm text-muted">No link.</div>
        )}
        {row.productUrl && canManage && (
          <a href={row.productUrl} target="_blank" rel="noreferrer noopener" className="inline-block mt-2 text-xs text-primary hover:underline">
            Open link ↗
          </a>
        )}
      </section>

      {/* Why */}
      <section className="rounded-xl border border-border bg-background p-5">
        <h3 className="text-sm font-bold mb-3">Why we need it</h3>
        <textarea
          defaultValue={row.reason ?? ""}
          onBlur={(e) => patch("reason", e.target.value.trim() || null)}
          disabled={!canManage}
          rows={4}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
          placeholder="Reason this purchase is needed."
        />
      </section>

      {/* Workflow buttons */}
      {canManage && !isDeclined && (
        <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-border">
          <button
            type="button"
            onClick={decline}
            disabled={pending}
            className="rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-1.5 text-sm hover:bg-rose-100 transition disabled:opacity-50 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
          >
            Decline
          </button>
          {!isFulfilled && (
            <button
              type="button"
              onClick={advance}
              disabled={pending}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {pending ? "Saving…" : STEP_META[FLOW[stepIdx]]?.nextLabel ?? "Advance →"}
            </button>
          )}
          {isFulfilled && (
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              ✓ Fulfilled — closed out.
            </span>
          )}
        </div>
      )}

      {/* Audit trail */}
      <section className="rounded-xl border border-border bg-foreground/[0.02] p-4">
        <h3 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">Audit trail</h3>
        <ul className="text-xs space-y-1 text-foreground/80">
          <li><strong>Submitted</strong> {fmtDateTime(row.stamps.requested)}</li>
          {row.stamps.approved  && <li><strong>Approved</strong>  {fmtDateTime(row.stamps.approved)}</li>}
          {row.stamps.purchased && <li><strong>Purchased</strong> {fmtDateTime(row.stamps.purchased)}</li>}
          {row.stamps.fulfilled && <li><strong>Fulfilled</strong> {fmtDateTime(row.stamps.fulfilled)}</li>}
          {row.stamps.declined  && <li><strong>Declined</strong>  {fmtDateTime(row.stamps.declined)}</li>}
        </ul>
      </section>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10px] uppercase tracking-widest text-muted font-medium">{children}</span>;
}

function EditableField({
  label, value, onSave, disabled, placeholder,
}: {
  label: string; value: string | null; onSave: (v: string | null) => void; disabled?: boolean; placeholder?: string;
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
