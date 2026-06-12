"use client";

/**
 * Voluntary offboarding entry point (Bird Dog spec Phase 14) — a quiet
 * footer on the BD hub. Two paths: "taking a break" or "leaving the
 * team"; both run the same short exit questionnaire, release the BD's
 * parks back to the pool, and offer the Referral Partner path.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitBdExitAction, type BdExitInput } from "@/app/actions/bd-exit";

const REASONS = [
  "Not enough time right now",
  "Cold calling wasn't for me",
  "Payouts take too long",
  "Personal / life reasons",
  "Other",
];

export function ExitFlow() {
  const router = useRouter();
  const [kind, setKind] = useState<"break" | "leave" | null>(null);
  const [done, setDone] = useState<{ kind: "break" | "leave"; referral: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Questionnaire state
  const [reason, setReason] = useState("");
  const [hardestPart, setHardestPart] = useState("");
  const [wouldHaveHelped, setWouldHaveHelped] = useState("");
  const [referralPartner, setReferralPartner] = useState(true);
  const [anythingElse, setAnythingElse] = useState("");

  function submit() {
    if (!kind || !reason) return;
    const input: BdExitInput = { kind, reason, hardestPart, wouldHaveHelped, referralPartner, anythingElse };
    startTransition(async () => {
      const r = await submitBdExitAction(input);
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't submit");
        return;
      }
      setDone({ kind, referral: referralPartner });
      setKind(null);
      toast.success(
        r.parksReleased
          ? `Done — ${r.parksReleased} park${r.parksReleased === 1 ? "" : "s"} released back to the pool.`
          : "Done — the team has been notified.",
      );
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-foreground/[0.02] p-4 text-sm text-foreground/80">
        {done.kind === "break" ? (
          <>🌴 You&apos;re marked as taking a break — no streaks, no guilt. Come back whenever you&apos;re ready.</>
        ) : (
          <>👋 Thanks for everything you put in. The team has been notified.</>
        )}{" "}
        {done.referral && (
          <>
            You&apos;re set up as a <strong>Referral Partner</strong> — spot a park that fits the Buy
            Box, submit it any time at{" "}
            <a href="https://rvparkexchange.com/lead" className="text-primary hover:underline" target="_blank" rel="noreferrer noopener">
              rvparkexchange.com/lead
            </a>{" "}
            and get paid when it closes.
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="text-center text-[11px] text-muted pt-2">
        Need to step back?{" "}
        <button type="button" onClick={() => setKind("break")} className="hover:text-foreground underline-offset-2 hover:underline">
          I&apos;m taking a break from RVX
        </button>
        {" · "}
        <button type="button" onClick={() => setKind("leave")} className="hover:text-foreground underline-offset-2 hover:underline">
          Leave the RVX team
        </button>
      </div>

      {kind && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setKind(null);
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold mb-1">
              {kind === "break" ? "🌴 Taking a break from RVX" : "👋 Leaving the RVX team"}
            </h3>
            <p className="text-xs text-muted mb-4">
              Two minutes, five questions — it genuinely shapes how we run the program. Your
              claimed parks and scheduled follow-ups go back to the pool (your notes stay on
              every park), and your stats are kept if you return.
            </p>

            <div className="space-y-3.5">
              <label className="block">
                <span className="text-xs font-semibold">What&apos;s the main reason? *</span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">— pick one —</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold">What was the hardest part of the role?</span>
                <textarea
                  value={hardestPart}
                  onChange={(e) => setHardestPart(e.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold">What would have helped you succeed?</span>
                <textarea
                  value={wouldHaveHelped}
                  onChange={(e) => setWouldHaveHelped(e.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>

              <label className="flex items-start gap-2.5 text-sm cursor-pointer rounded-lg border border-border bg-foreground/[0.02] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={referralPartner}
                  onChange={(e) => setReferralPartner(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-1 focus:ring-primary"
                />
                <span>
                  Keep me on as a <strong>Referral Partner</strong> — I&apos;ll submit parks when I
                  spot them, no schedule or commitments.
                </span>
              </label>

              <label className="block">
                <span className="text-xs font-semibold">Anything else we should know?</span>
                <textarea
                  value={anythingElse}
                  onChange={(e) => setAnythingElse(e.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setKind(null)} className="text-xs text-muted hover:text-foreground px-2 py-1.5">
                Never mind
              </button>
              <button
                type="button"
                disabled={!reason || isPending}
                onClick={submit}
                className="rounded-md bg-foreground text-background px-3.5 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition"
              >
                {isPending ? "Submitting…" : kind === "break" ? "Confirm break" : "Confirm — I'm leaving"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
