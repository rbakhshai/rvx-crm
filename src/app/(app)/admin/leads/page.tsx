/**
 * /admin/leads — pool browser. Shows the current state of every raw
 * lead, grouped by status. Filter / paginate / undo a batch / hard-
 * delete from here.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { rawLeads, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../page-shell";
import { fmtDate } from "@/lib/date-format";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | "pool" | "claimed" | "converted" | "dead";

function isStatusFilter(v: string | undefined): v is StatusFilter {
  return v === "all" || v === "pool" || v === "claimed" || v === "converted" || v === "dead";
}

const STATUS_LABEL: Record<Exclude<StatusFilter, "all">, string> = {
  pool: "Pool",
  claimed: "Claimed",
  converted: "Converted",
  dead: "Dead",
};

const STATUS_TONE: Record<Exclude<StatusFilter, "all">, string> = {
  pool:      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  claimed:   "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  converted: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  dead:      "bg-foreground/[0.05] text-foreground/60 border-border",
};

export default async function LeadsPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "manage_users"))) {
    return (
      <PageShell title="Lead Pool" subtitle="You don't have permission to view the pool.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;Manage users&quot; capability.</p>
      </PageShell>
    );
  }

  const params = await searchParams;
  const statusFilter: StatusFilter = isStatusFilter(params.s) ? params.s : "all";

  const where = and(
    isNull(rawLeads.deletedAt),
    statusFilter === "all" ? undefined : eq(rawLeads.status, statusFilter),
  );

  const [rows, counts, claimants] = await Promise.all([
    db.select().from(rawLeads).where(where).orderBy(desc(rawLeads.createdAt)).limit(100),
    db
      .select({
        status: rawLeads.status,
        c: sql<number>`COUNT(*)::int`,
      })
      .from(rawLeads)
      .where(isNull(rawLeads.deletedAt))
      .groupBy(rawLeads.status),
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
  ]);
  const claimantMap = new Map(claimants.map((u) => [u.id, u.name]));
  const countByStatus = new Map(counts.map((c) => [c.status, c.c]));
  const totalRows = counts.reduce((acc, c) => acc + c.c, 0);

  return (
    <PageShell
      title="Lead Pool"
      subtitle={`${totalRows} total lead${totalRows === 1 ? "" : "s"} in the system.`}
      action={
        <Link
          href="/admin/leads/upload"
          className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 transition"
        >
          + Upload CSV
        </Link>
      }
    >
      {/* Status filter chips */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        <Chip href="/admin/leads" active={statusFilter === "all"}>
          All <span className="ml-1 text-foreground/50 tabular-nums">· {totalRows}</span>
        </Chip>
        {(["pool", "claimed", "converted", "dead"] as const).map((s) => (
          <Chip key={s} href={`/admin/leads?s=${s}`} active={statusFilter === s}>
            <span className={cn("inline-flex items-center rounded-full px-1.5 mr-1 text-[10px] font-semibold border", STATUS_TONE[s])}>
              {STATUS_LABEL[s]}
            </span>
            <span className="text-foreground/50 tabular-nums">{countByStatus.get(s) ?? 0}</span>
          </Chip>
        ))}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center">
          <p className="text-sm text-muted">
            {statusFilter === "all"
              ? "No leads yet. Upload a CSV to get started."
              : `No leads with status "${STATUS_LABEL[statusFilter as Exclude<StatusFilter, "all">]}"`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-foreground/[0.02]">
              <tr>
                <Th>Park</Th>
                <Th>Location</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
                <Th>Attempts</Th>
                <Th>Claimed by</Th>
                <Th>Added</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = r.status as Exclude<StatusFilter, "all">;
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-foreground/[0.02] transition">
                    <td className="px-3 py-2.5 font-medium">
                      <Link href={`/admin/leads/${r.id}` as never} className="hover:underline">
                        {r.parkName ?? <span className="text-muted">(unnamed)</span>}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-foreground/80">
                      {[r.city, r.state].filter(Boolean).join(", ") || <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-foreground/80">
                      {r.ownerName ? (
                        <div>
                          <div>{r.ownerName}</div>
                          {r.ownerPhone && <div className="text-[11px] text-muted">{r.ownerPhone}</div>}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider border", STATUS_TONE[status])}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{r.callAttempts}</td>
                    <td className="px-3 py-2.5 text-foreground/80">
                      {r.claimedById ? claimantMap.get(r.claimedById) ?? "?" : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted text-xs">{fmtDate(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalRows > 100 && (
        <p className="text-[11px] text-muted text-center mt-3">
          Showing newest 100 of {totalRows}. Pagination coming next iteration.
        </p>
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
        active ? "bg-foreground text-background border-foreground font-semibold" : "bg-background border-border text-foreground/70 hover:bg-foreground/[0.04]",
      )}
    >
      {children}
    </Link>
  );
}
