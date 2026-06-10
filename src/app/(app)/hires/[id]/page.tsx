/**
 * /hires/[id] — request detail + workflow controls.
 *
 * Big stepper across the top shows where the request sits. Each field
 * is inline-editable. Footer has Advance / Send back / Withdraw / Reopen
 * buttons gated to whoever currently has the ball.
 */
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { hireRequests, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../page-shell";
import { fmtDateTime } from "@/lib/date-format";
import { HireDetailClient } from "./client";

export default async function HireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_hires"))) notFound();

  const { id } = await params;
  const [row] = await db
    .select({
      id: hireRequests.id,
      candidateName: hireRequests.candidateName,
      candidateEmail: hireRequests.candidateEmail,
      candidatePhone: hireRequests.candidatePhone,
      type: hireRequests.type,
      status: hireRequests.status,
      forUnit: hireRequests.forUnit,
      roleTitle: hireRequests.roleTitle,
      rolesAndDuties: hireRequests.rolesAndDuties,
      financeNotes: hireRequests.financeNotes,
      founderNotes: hireRequests.founderNotes,
      requesterFinalNotes: hireRequests.requesterFinalNotes,
      requestedById: hireRequests.requestedById,
      requesterName: userTable.name,
      createdAt: hireRequests.createdAt,
      updatedAt: hireRequests.updatedAt,
      finalizedAt: hireRequests.finalizedAt,
      withdrawnAt: hireRequests.withdrawnAt,
      withdrawnReason: hireRequests.withdrawnReason,
    })
    .from(hireRequests)
    .leftJoin(userTable, eq(userTable.id, hireRequests.requestedById))
    .where(eq(hireRequests.id, id))
    .limit(1);

  if (!row) notFound();

  const canManage = await hasPermission(session.user, "manage_hires");

  return (
    <PageShell
      title={row.candidateName}
      subtitle={`${row.roleTitle ?? "(no role title)"} · ${row.forUnit ?? "(no unit)"} · opened ${fmtDateTime(row.createdAt)}${row.requesterName ? " by " + row.requesterName : ""}`}
      action={
        <Link href="/hires" className="text-xs text-muted hover:text-foreground">
          ← Back to list
        </Link>
      }
      width="default"
    >
      <HireDetailClient
        row={{
          id: row.id,
          candidateName: row.candidateName,
          candidateEmail: row.candidateEmail,
          candidatePhone: row.candidatePhone,
          type: row.type,
          status: row.status,
          forUnit: row.forUnit,
          roleTitle: row.roleTitle,
          rolesAndDuties: row.rolesAndDuties,
          financeNotes: row.financeNotes,
          founderNotes: row.founderNotes,
          requesterFinalNotes: row.requesterFinalNotes,
          finalizedAt: row.finalizedAt?.toISOString() ?? null,
          withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
          withdrawnReason: row.withdrawnReason,
        }}
        canManage={canManage}
      />
    </PageShell>
  );
}
