/**
 * /reimbursements — "buy this for the park" queue.
 *
 * Visibility: each person sees only their own requests; the CEO (admin)
 * and Finance (cfo) see the whole team's.
 *
 * Flow: pending → approved → purchased → fulfilled. Decline at any
 * point with a reason. Per Reza's spec: park / requested / needed-by /
 * item / why / link / amount.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { reimbursementRequests, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { getEffectiveRole } from "@/lib/view-as";
import { PageShell } from "../page-shell";
import { fmtDate } from "@/lib/date-format";
import { cn } from "@/lib/cn";

type Filter = "active" | "all" | "pending" | "approved" | "purchased" | "fulfilled" | "declined";
function isFilter(v: string | undefined): v is Filter {
  return v === "active" || v === "all" || v === "pending" || v === "approved" || v === "purchased" || v === "fulfilled" || v === "declined";
}

const STATUS_LABEL: Record<Exclude<Filter, "active" | "all">, string> = {
  pending:    "Pending",
  approved:   "Approved",
  purchased:  "Purchased",
  fulfilled:  "Fulfilled",
  declined:   "Declined",
};

const STATUS_TONE: Record<Exclude<Filter, "active" | "all">, string> = {
  pending:    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  approved:   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  purchased:  "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30",
  fulfilled:  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  declined:   "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
};

const ACTIVE_STATUSES = ["pending", "approved", "purchased"] as const;

export default async function ReimbursementsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_reimbursements"))) {
    return (
      <PageShell title="Reimbursements" subtitle="You don't have permission to view the purchase queue.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;See Reimbursements&quot; capability.</p>
      </PageShell>
    );
  }
  const canManage = await hasPermission(session.user, "manage_reimbursements");

  // Visibility: everyone sees only their own requests; the CEO (admin)
  // and Finance (cfo) see the whole team's.
  const role = await getEffectiveRole(session.user.role);
  const canSeeAll = role === "admin" || role === "cfo";
  const ownOnly = canSeeAll ? undefined : eq(reimbursementRequests.requestedById, session.user.id);

  const params = await searchParams;
  const filter: Filter = isFilter(params.s) ? params.s : "active";

  const rows = await db
    .select({
      id: reimbursementRequests.id,
      parkName: reimbursementRequests.parkName,
      itemDescription: reimbursementRequests.itemDescription,
      amountCents: reimbursementRequests.amountCents,
      status: reimbursementRequests.status,
      requestedAt: reimbursementRequests.requestedAt,
      neededBy: reimbursementRequests.neededBy,
      requesterName: userTable.name,
    })
    .from(reimbursementRequests)
    .leftJoin(userTable, eq(userTable.id, reimbursementRequests.requestedById))
    .where(
      and(
        isNull(reimbursementRequests.deletedAt),
        ownOnly,
        filter === "active" || filter === "all"
          ? undefined
          : eq(reimbursementRequests.status, filter),
      ),
    )
    .orderBy(desc(reimbursementRequests.requestedAt));

  const visibleRows = filter === "active"
    ? rows.filter((r) => (ACTIVE_STATUSES as readonly string[]).includes(r.status))
    : rows;

  // Status counts (scoped the same way as the list) for the chip badges.
  const all = await db
    .select({ status: reimbursementRequests.status })
    .from(reimbursementRequests)
    .where(and(isNull(reimbursementRequests.deletedAt), ownOnly));
  const countByStatus = new Map<string, number>();
  for (const r of all) countByStatus.set(r.status, (countByStatus.get(r.status) ?? 0) + 1);
  const activeCount = (ACTIVE_STATUSES as readonly string[]).reduce(
    (acc, s) => acc + (countByStatus.get(s) ?? 0), 0,
  );

  return (
    <PageShell
      title="Reimbursements"
      subtitle={
        canSeeAll
          ? "Every team member's purchase requests. Approve, mark purchased, mark fulfilled."
          : "Your purchase requests. Submit and track status — only you, the CEO, and Finance see them."
      }
      action={
        canManage ? (
          <Link
            href="/reimbursements/new"
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 transition"
          >
            + New request
          </Link>
        ) : null
      }
      width="default"
    >
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        <Chip href="/reimbursements" active={filter === "active"}>
          Active <span className="ml-1 text-foreground/50 tabular-nums">· {activeCount}</span>
        </Chip>
        <Chip href="/reimbursements?s=all" active={filter === "all"}>
          All <span className="ml-1 text-foreground/50 tabular-nums">· {all.length}</span>
        </Chip>
        {(["pending", "approved", "purchased", "fulfilled", "declined"] as const).map((s) => (
          <Chip key={s} href={`/reimbursements?s=${s}`} active={filter === s}>
            <span className={cn("inline-flex items-center rounded-full px-1.5 mr-1 text-[10px] font-semibold border", STATUS_TONE[s])}>
              {STATUS_LABEL[s]}
            </span>
            <span className="text-foreground/50 tabular-nums">{countByStatus.get(s) ?? 0}</span>
          </Chip>
        ))}
      </div>

      {visibleRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center text-sm text-muted">
          {filter === "active"
            ? "No active requests. Hit \"+ New request\" to submit one."
            : "Nothing in this status."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-foreground/[0.02]">
              <tr>
                <Th>Item</Th>
                <Th>Park</Th>
                <Th>Requester</Th>
                <Th right>Amount</Th>
                <Th>Needed by</Th>
                <Th>Status</Th>
                <Th>Submitted</Th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-foreground/[0.02] transition">
                  <td className="px-3 py-2.5 font-medium">
                    <Link href={`/reimbursements/${r.id}`} className="hover:underline truncate inline-block max-w-[28ch] align-bottom">
                      {r.itemDescription}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-foreground/80">{r.parkName ?? <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-2.5 text-foreground/80">{r.requesterName ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {r.amountCents != null ? `$${(r.amountCents / 100).toFixed(2)}` : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-foreground/80">
                    {r.neededBy ? fmtDate(r.neededBy) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider border",
                      STATUS_TONE[r.status as Exclude<Filter, "active" | "all">],
                    )}>
                      {STATUS_LABEL[r.status as Exclude<Filter, "active" | "all">]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted text-xs">{fmtDate(r.requestedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn(
      "px-3 py-2.5 text-[11px] uppercase tracking-widest text-muted font-semibold whitespace-nowrap",
      right ? "text-right" : "text-left",
    )}>
      {children}
    </th>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href as never}
      className={cn(
        "rounded-full px-3 py-1 text-xs border transition",
        active
          ? "bg-foreground text-background border-foreground font-semibold"
          : "bg-background border-border text-foreground/70 hover:bg-foreground/[0.04]",
      )}
    >
      {children}
    </Link>
  );
}
