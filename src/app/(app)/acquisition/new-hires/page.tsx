/**
 * /acquisition/new-hires — the Acquisition Lead's New Hire workflow.
 *
 * Same engine as the leadership desk (/hires), scoped to
 * category='acquisition' so the two queues stay separate. Used to vet a
 * new BD / acquisition rep through the approval chain before the
 * contract goes out.
 *
 * Gated by view_hires (the Acquisition Lead / Erica + admin have it).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { hireRequests, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../page-shell";
import { fmtDate } from "@/lib/date-format";
import { cn } from "@/lib/cn";
import {
  HIRE_STATUS_LABEL as STATUS_LABEL,
  HIRE_STATUS_TONE as STATUS_TONE,
  HIRE_TYPE_LABEL as TYPE_LABEL,
  isHireStatus as isStatus,
  type HireStatusKey as StatusKey,
} from "@/lib/status-labels";

export default async function AcquisitionHiresPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_hires"))) {
    return (
      <PageShell title="New Hires" subtitle="You don't have permission to view the hiring workflow.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;See New Hires&quot; capability.</p>
      </PageShell>
    );
  }
  const canManage = await hasPermission(session.user, "manage_hires");

  const params = await searchParams;
  const filter: StatusKey = isStatus(params.s) ? params.s : "active";

  // "Active" = anything not finalized / withdrawn (the daily queue).
  const ACTIVE_STATUSES = ["draft", "finance_review", "founder_review", "requester_review"] as const;

  const rows = await db
    .select({
      id: hireRequests.id,
      candidateName: hireRequests.candidateName,
      type: hireRequests.type,
      status: hireRequests.status,
      forUnit: hireRequests.forUnit,
      roleTitle: hireRequests.roleTitle,
      requestedById: hireRequests.requestedById,
      requesterName: userTable.name,
      createdAt: hireRequests.createdAt,
      finalizedAt: hireRequests.finalizedAt,
    })
    .from(hireRequests)
    .leftJoin(userTable, eq(userTable.id, hireRequests.requestedById))
    .where(
      and(
        isNull(hireRequests.deletedAt),
        eq(hireRequests.category, "acquisition"),
        filter === "all"
          ? undefined
          : filter === "active"
            ? undefined // handled client-side below
            : eq(hireRequests.status, filter),
      ),
    )
    .orderBy(asc(hireRequests.finalizedAt), desc(hireRequests.createdAt));

  const visibleRows = filter === "active"
    ? rows.filter((r) => (ACTIVE_STATUSES as readonly string[]).includes(r.status))
    : rows;

  const all = await db
    .select({ status: hireRequests.status })
    .from(hireRequests)
    .where(and(isNull(hireRequests.deletedAt), eq(hireRequests.category, "acquisition")));
  const countByStatus = new Map<string, number>();
  for (const r of all) {
    countByStatus.set(r.status, (countByStatus.get(r.status) ?? 0) + 1);
  }
  const activeCount = (ACTIVE_STATUSES as readonly string[]).reduce(
    (acc, s) => acc + (countByStatus.get(s) ?? 0), 0,
  );

  return (
    <PageShell
      title="New Hires"
      subtitle="Vet a new BD or acquisition rep through the approval workflow before the contract goes out."
      action={
        canManage ? (
          <Link
            href="/acquisition/new-hires/new"
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 transition"
          >
            + New request
          </Link>
        ) : null
      }
      width="default"
    >
      {/* Filter chips */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        <Chip href="/acquisition/new-hires" active={filter === "active"}>
          Active <span className="ml-1 text-foreground/50 tabular-nums">· {activeCount}</span>
        </Chip>
        <Chip href="/acquisition/new-hires?s=all" active={filter === "all"}>
          All <span className="ml-1 text-foreground/50 tabular-nums">· {all.length}</span>
        </Chip>
        {(["draft", "finance_review", "founder_review", "requester_review", "finalized", "withdrawn"] as const).map((s) => (
          <Chip key={s} href={`/acquisition/new-hires?s=${s}`} active={filter === s}>
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
            ? "No active requests. Hit \"+ New request\" to start one."
            : "Nothing in this status."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-foreground/[0.02]">
              <tr>
                <Th>Candidate</Th>
                <Th>Role / Unit</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Requester</Th>
                <Th>Opened</Th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-foreground/[0.02] transition">
                  <td className="px-3 py-2.5 font-medium">
                    <Link href={`/acquisition/new-hires/${r.id}`} className="hover:underline">
                      {r.candidateName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-foreground/80">
                    {r.roleTitle ? (
                      <div>
                        <div>{r.roleTitle}</div>
                        {r.forUnit && <div className="text-[11px] text-muted">{r.forUnit}</div>}
                      </div>
                    ) : (
                      r.forUnit ?? <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-foreground/80">{TYPE_LABEL[r.type] ?? r.type}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider border",
                      STATUS_TONE[r.status as Exclude<StatusKey, "all" | "active">],
                    )}>
                      {STATUS_LABEL[r.status as Exclude<StatusKey, "all" | "active">]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-foreground/80">{r.requesterName ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted text-xs">{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-widest text-muted font-semibold whitespace-nowrap">{children}</th>;
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
