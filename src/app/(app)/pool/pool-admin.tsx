"use client";

/**
 * Pool administration — CEO/Finance only (server actions re-enforce).
 * Add members with a seat-start date, adjust dates, pause membership,
 * and record quarterly distributions.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addPoolMemberAction,
  setPoolMemberAction,
  recordDistributionAction,
} from "@/app/actions/pool";

const inputClass =
  "rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export function PoolAdmin({
  eligible,
  members,
}: {
  eligible: Array<{ id: string; name: string; role: string }>;
  members: Array<{ memberId: string; name: string; seatStart: string; active: boolean }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Add member
  const [pickId, setPickId] = useState("");
  const [seatStart, setSeatStart] = useState("");

  // Record distribution
  const [quarter, setQuarter] = useState("");
  const [totalUsd, setTotalUsd] = useState("");
  const [notes, setNotes] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't save");
        return;
      }
      toast.success(okMsg);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-background p-4 space-y-5">
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold">
        ⚙️ Manage the pool — CEO / Finance
      </div>

      {/* Add member */}
      <div>
        <div className="text-xs font-semibold mb-1.5">Add a leadership member</div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={pickId} onChange={(e) => setPickId(e.target.value)} className={inputClass}>
            <option value="">— pick a person —</option>
            {eligible.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={seatStart}
            onChange={(e) => setSeatStart(e.target.value)}
            className={inputClass}
            title="Leadership seat start — the 4-year clock starts here"
          />
          <button
            type="button"
            disabled={!pickId || !seatStart || isPending}
            onClick={() => {
              run(() => addPoolMemberAction(pickId, seatStart), "Added to the pool");
              setPickId(""); setSeatStart("");
            }}
            className="rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition"
          >
            Add
          </button>
        </div>
        <p className="text-[11px] text-muted mt-1">
          Seat start = the day they joined the leadership team, not their first day as a BD.
        </p>
      </div>

      {/* Adjust members */}
      {members.length > 0 && (
        <div>
          <div className="text-xs font-semibold mb-1.5">Adjust</div>
          <ul className="space-y-1.5">
            {members.map((m) => (
              <li key={m.memberId} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-32 truncate font-medium">{m.name}</span>
                <input
                  type="date"
                  defaultValue={m.seatStart}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && v !== m.seatStart) {
                      run(() => setPoolMemberAction(m.memberId, { seatStartAt: v }), "Seat date updated");
                    }
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    run(
                      () => setPoolMemberAction(m.memberId, { active: !m.active }),
                      m.active ? "Paused — out of the pool" : "Reactivated",
                    )
                  }
                  className="text-[11px] text-muted hover:text-foreground underline-offset-2 hover:underline"
                >
                  {m.active ? "Pause membership" : "Reactivate"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Record a payout */}
      <div>
        <div className="text-xs font-semibold mb-1.5">Record a quarterly distribution</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            placeholder="2030-Q1"
            className={`${inputClass} w-24`}
          />
          <input
            value={totalUsd}
            onChange={(e) => setTotalUsd(e.target.value)}
            placeholder="Total $"
            inputMode="decimal"
            className={`${inputClass} w-28`}
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className={`${inputClass} flex-1 min-w-40`}
          />
          <button
            type="button"
            disabled={isPending || !quarter || !totalUsd}
            onClick={() => {
              run(
                () => recordDistributionAction({ quarter, totalUsd: parseFloat(totalUsd), notes }),
                "Distribution recorded",
              );
              setQuarter(""); setTotalUsd(""); setNotes("");
            }}
            className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 transition"
          >
            Record
          </button>
        </div>
        <p className="text-[11px] text-muted mt-1">
          The split across vested members is computed from today&apos;s points and frozen into the
          record — roster changes later never rewrite history.
        </p>
      </div>
    </section>
  );
}
