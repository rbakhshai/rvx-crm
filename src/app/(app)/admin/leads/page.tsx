/**
 * /admin/leads — pool browser. Shows the current state of every raw
 * lead, grouped by status. Filter / paginate / undo a batch / hard-
 * delete from here.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
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
  searchParams: Promise<{ s?: string; st?: string }>;
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
  // Geographic filter: comma-separated 2-letter state codes from
  // ?st=TX,AZ,NM. Empty / missing = no state filter (all states).
  const selectedStates = parseStateFilter(params.st);

  const where = and(
    isNull(rawLeads.deletedAt),
    statusFilter === "all" ? undefined : eq(rawLeads.status, statusFilter),
    selectedStates.length > 0 ? inArray(rawLeads.state, selectedStates) : undefined,
  );

  const [rows, counts, claimants, stateCounts] = await Promise.all([
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
    // Per-state counts respect the status filter so Kevin can drill
    // "show me POOL leads by state" or "CONVERTED leads by state".
    // State filter itself NOT applied so the chip row always shows
    // every state with at-least-one-lead.
    db
      .select({
        state: rawLeads.state,
        c: sql<number>`COUNT(*)::int`,
      })
      .from(rawLeads)
      .where(
        and(
          isNull(rawLeads.deletedAt),
          statusFilter === "all" ? undefined : eq(rawLeads.status, statusFilter),
        ),
      )
      .groupBy(rawLeads.state),
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
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <Chip href={buildHref(null, selectedStates)} active={statusFilter === "all"}>
          All <span className="ml-1 text-foreground/50 tabular-nums">· {totalRows}</span>
        </Chip>
        {(["pool", "claimed", "converted", "dead"] as const).map((s) => (
          <Chip key={s} href={buildHref(s, selectedStates)} active={statusFilter === s}>
            <span className={cn("inline-flex items-center rounded-full px-1.5 mr-1 text-[10px] font-semibold border", STATUS_TONE[s])}>
              {STATUS_LABEL[s]}
            </span>
            <span className="text-foreground/50 tabular-nums">{countByStatus.get(s) ?? 0}</span>
          </Chip>
        ))}
      </div>

      {/* Geographic filter — Kevin asked for this. Each state chip is
          toggleable; selected states accumulate in ?st=TX,AZ,NM. */}
      <GeoFilter
        statusFilter={statusFilter}
        selectedStates={selectedStates}
        stateCounts={stateCounts.map((s) => ({ state: s.state, count: s.c }))}
      />

      {selectedStates.length > 0 && (
        <div className="mb-4 -mt-1 text-[11px] text-muted flex items-center gap-2">
          <span>
            Showing only {selectedStates.length === 1 ? `state ${selectedStates[0]}` : `${selectedStates.length} states`}.
          </span>
          <Link
            href={buildHref(statusFilter === "all" ? null : statusFilter, []) as never}
            className="text-foreground hover:underline"
          >
            Clear
          </Link>
        </div>
      )}

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

/**
 * Parse a comma-separated list of 2-letter state codes from the URL
 * (?st=TX,AZ,NM). Anything not matching /^[A-Z]{2}$/ is dropped so the
 * query stays safe. Returns deduped uppercase codes.
 */
function parseStateFilter(raw: string | undefined): string[] {
  if (!raw) return [];
  const codes = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{2}$/.test(s));
  return Array.from(new Set(codes));
}

/**
 * Build a URL that preserves the status filter and the multi-select
 * state filter. Pass `nextStatus = null` to clear the status, or pass
 * a new state list to swap geographic selection.
 */
function buildHref(
  status: Exclude<StatusFilter, "all"> | null,
  states: string[],
): string {
  const qp = new URLSearchParams();
  if (status) qp.set("s", status);
  if (states.length > 0) qp.set("st", states.join(","));
  const q = qp.toString();
  return q ? `/admin/leads?${q}` : "/admin/leads";
}

/**
 * Per-state distribution row. Each chip toggles its state in/out of
 * the selection. Hidden when there's only one state in the system
 * (no useful filter to apply yet).
 */
function GeoFilter({
  statusFilter,
  selectedStates,
  stateCounts,
}: {
  statusFilter: StatusFilter;
  selectedStates: string[];
  stateCounts: Array<{ state: string | null; count: number }>;
}) {
  // Sort by count desc — biggest piles first — and drop nulls. Skip
  // entirely if there's nothing to filter against.
  const sorted = stateCounts
    .filter((s): s is { state: string; count: number } => !!s.state)
    .sort((a, b) => b.count - a.count);

  if (sorted.length < 2) return null;

  const statusParam = statusFilter === "all" ? null : statusFilter;
  const selectedSet = new Set(selectedStates);

  return (
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1.5">
        🗺️ States · click to filter
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {sorted.map(({ state, count }) => {
          const active = selectedSet.has(state);
          // Toggle this state in the selection.
          const nextSet = new Set(selectedSet);
          if (active) nextSet.delete(state);
          else nextSet.add(state);
          const href = buildHref(statusParam, Array.from(nextSet).sort());
          return (
            <Link
              key={state}
              href={href as never}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] border transition tabular-nums",
                active
                  ? "bg-foreground text-background border-foreground font-semibold"
                  : "bg-background border-border text-foreground/75 hover:bg-foreground/[0.04]",
              )}
            >
              <span>{state}</span>
              <span className={cn("text-[10px]", active ? "text-background/70" : "text-muted")}>{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
