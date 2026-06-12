"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { bdExitSurveys } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/view-as";
import { sendNotification } from "@/lib/email";

const BD_NOTIFY_EMAIL = process.env.BD_NOTIFY_EMAIL ?? "recruiting@rvparkexchange.com";

export type BdExitInput = {
  kind: "break" | "leave";
  reason: string;
  hardestPart?: string;
  wouldHaveHelped?: string;
  referralPartner: boolean;
  anythingElse?: string;
};

/**
 * Voluntary offboarding (Bird Dog spec Phase 14). Records the exit
 * questionnaire, releases every park the BD holds (claims + scheduled
 * follow-ups) back to the pool, and pings leadership. Notes stay on
 * the parks; the account itself is untouched — leadership decides on
 * pause vs. removal from /bd-team.
 */
export async function submitBdExitAction(
  input: BdExitInput,
): Promise<{ ok: boolean; parksReleased?: number; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Not authenticated" };
  const user = session.user;

  const role = await getEffectiveRole(user.role);
  if (!["bd_level_1", "bd_level_2", "bd_level_3"].includes(role ?? "")) {
    return { ok: false, error: "Only bird-dog seats can use this." };
  }
  if (input.kind !== "break" && input.kind !== "leave") {
    return { ok: false, error: "Pick break or leave." };
  }
  if (!input.reason?.trim()) {
    return { ok: false, error: "Pick a reason — it helps us improve the program." };
  }

  // Release active claims.
  const claimed = await db.execute(sql`
    UPDATE raw_leads
    SET status = 'pool', claimed_by_id = NULL, claimed_at = NULL, updated_at = NOW()
    WHERE claimed_by_id = ${user.id} AND status = 'claimed'
    RETURNING id
  `);
  // Release the follow-up pipeline.
  const scheduled = await db.execute(sql`
    UPDATE raw_leads
    SET next_follow_up_at = NULL, follow_up_cadence_days = NULL,
        follow_up_set_by_id = NULL, updated_at = NOW()
    WHERE status = 'pool'
      AND next_follow_up_at IS NOT NULL
      AND (follow_up_set_by_id = ${user.id} OR last_call_by_id = ${user.id})
    RETURNING id
  `);
  const count =
    (((claimed as unknown as { rows?: unknown[] }).rows ?? (claimed as unknown as unknown[]))?.length ?? 0) +
    (((scheduled as unknown as { rows?: unknown[] }).rows ?? (scheduled as unknown as unknown[]))?.length ?? 0);

  await db.insert(bdExitSurveys).values({
    userId: user.id,
    kind: input.kind,
    answers: {
      reason: input.reason.trim(),
      hardestPart: input.hardestPart?.trim() || null,
      wouldHaveHelped: input.wouldHaveHelped?.trim() || null,
      referralPartner: !!input.referralPartner,
      anythingElse: input.anythingElse?.trim() || null,
    },
    parksReleased: String(count),
  });

  // Leadership heads-up — best-effort, never blocks the exit itself.
  try {
    await sendNotification({
      kind: "bd_exit",
      to: BD_NOTIFY_EMAIL,
      subject: `${user.name} is ${input.kind === "break" ? "taking a break from" : "leaving"} the BD team`,
      bodyMd: [
        `${user.name} (${user.email}) submitted the exit questionnaire.`,
        ``,
        `Type:              ${input.kind === "break" ? "Taking a break" : "Leaving the team"}`,
        `Reason:            ${input.reason.trim()}`,
        `Hardest part:      ${input.hardestPart?.trim() || "—"}`,
        `Would have helped: ${input.wouldHaveHelped?.trim() || "—"}`,
        `Referral Partner:  ${input.referralPartner ? "YES — wants to keep submitting leads" : "no"}`,
        `Anything else:     ${input.anythingElse?.trim() || "—"}`,
        ``,
        `Parks released back to the pool: ${count} (notes preserved).`,
        `Review on /bd-team.`,
      ].join("\n"),
      payload: { userId: user.id, kind: input.kind },
    });
  } catch (e) {
    console.error("[bd-exit] notification failed:", e);
  }

  revalidatePath("/today");
  revalidatePath("/bd-team");
  revalidatePath("/lead-work");
  revalidatePath("/my-leads");
  return { ok: true, parksReleased: count };
}
