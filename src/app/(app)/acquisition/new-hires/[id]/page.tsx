/**
 * /acquisition/new-hires/[id] — acquisition hire detail + workflow.
 *
 * Reuses the exact workflow UI from the leadership desk
 * (HireDetailClient) and the shared hire actions. Scoped to
 * category='acquisition' so leadership requests can't be opened here.
 */
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { hireRequests, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../../page-shell";
import { fmtDateTime } from "@/lib/date-format";
import { HireDetailClient } from "@/app/(app)/hires/[id]/client";

export default async function AcquisitionHireDetailPage({
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
      category: hireRequests.category,
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

  // Acquisition desk only — leadership hires live at /hires.
  if (!row || row.category !== "acquisition") notFound();

  const canManage = await hasPermission(session.user, "manage_hires");

  return (
    <PageShell
      title={row.candidateName}
      subtitle={`${row.roleTitle ?? "(no role title)"} · ${row.forUnit ?? "(no unit)"} · opened ${fmtDateTime(row.createdAt)}${row.requesterName ? " by " + row.requesterName : ""}`}
      action={
        <Link href="/acquisition/new-hires" className="text-xs text-muted hover:text-foreground">
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
