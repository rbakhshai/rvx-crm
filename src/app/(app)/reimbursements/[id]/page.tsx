/**
 * /reimbursements/[id] — detail + approve / decline / mark steps.
 *
 * Stepper at top mirrors the Hires UX: pending → approved → purchased
 * → fulfilled. Decline kills it with a captured reason.
 */
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reimbursementRequests, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../page-shell";
import { fmtDateTime } from "@/lib/date-format";
import { ReimbursementDetailClient } from "./client";

export default async function ReimbursementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_reimbursements"))) notFound();

  const { id } = await params;
  const [row] = await db
    .select({
      id: reimbursementRequests.id,
      parkName: reimbursementRequests.parkName,
      itemDescription: reimbursementRequests.itemDescription,
      reason: reimbursementRequests.reason,
      productUrl: reimbursementRequests.productUrl,
      amountCents: reimbursementRequests.amountCents,
      neededBy: reimbursementRequests.neededBy,
      status: reimbursementRequests.status,
      requestedById: reimbursementRequests.requestedById,
      requesterName: userTable.name,
      requestedAt: reimbursementRequests.requestedAt,
      approvedAt: reimbursementRequests.approvedAt,
      purchasedAt: reimbursementRequests.purchasedAt,
      fulfilledAt: reimbursementRequests.fulfilledAt,
      declinedAt: reimbursementRequests.declinedAt,
      declineReason: reimbursementRequests.declineReason,
    })
    .from(reimbursementRequests)
    .leftJoin(userTable, eq(userTable.id, reimbursementRequests.requestedById))
    .where(eq(reimbursementRequests.id, id))
    .limit(1);

  if (!row) notFound();

  const canManage = await hasPermission(session.user, "manage_reimbursements");

  return (
    <PageShell
      title={row.itemDescription}
      subtitle={`Submitted ${fmtDateTime(row.requestedAt)}${row.requesterName ? " by " + row.requesterName : ""}${row.parkName ? " · " + row.parkName : ""}`}
      action={
        <Link href="/reimbursements" className="text-xs text-muted hover:text-foreground">
          ← Back to list
        </Link>
      }
      width="default"
    >
      <ReimbursementDetailClient
        row={{
          id: row.id,
          parkName: row.parkName,
          itemDescription: row.itemDescription,
          reason: row.reason,
          productUrl: row.productUrl,
          amountCents: row.amountCents,
          neededByIso: row.neededBy?.toISOString() ?? null,
          status: row.status,
          declineReason: row.declineReason,
          stamps: {
            requested: row.requestedAt.toISOString(),
            approved: row.approvedAt?.toISOString() ?? null,
            purchased: row.purchasedAt?.toISOString() ?? null,
            fulfilled: row.fulfilledAt?.toISOString() ?? null,
            declined: row.declinedAt?.toISOString() ?? null,
          },
        }}
        canManage={canManage}
      />
    </PageShell>
  );
}
