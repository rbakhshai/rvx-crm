/**
 * Team — internal roster scorecard + Bird Dog capacity view.
 *
 * Pulls live users from the CRM. Verdict + dept are editable per-user
 * via ops_content (scope: team.verdict.<userId>, team.dept.<userId>).
 */
import Link from "next/link";
import { and, asc, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { user, birdDogs } from "@/db/schema";
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, StatusPill } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";

const REVALIDATE = "/ops/team";

const DEFAULT_DEPT: Record<string, string> = {
  admin: "Leadership",
  acquisitions_manager: "Sales & Marketing",
  bird_dog_manager: "Operations",
  cfo: "Finance",
  closer: "Sales",
  underwriter: "Underwriting",
  due_diligence: "Operations",
  transaction_coord: "Operations",
  dispo_manager: "Sales",
  bd_level_1: "Sales & Marketing",
  bd_level_2: "Sales & Marketing",
  bd_level_3: "Sales & Marketing",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin / Founder",
  acquisitions_manager: "Sales & Marketing",
  bird_dog_manager: "Operations",
  cfo: "Finance",
  closer: "Closer",
  underwriter: "Underwriter",
  due_diligence: "Due Diligence",
  transaction_coord: "Transaction Coord",
  dispo_manager: "Dispo Manager",
  bd_level_1: "Bird Dog Level 1",
  bd_level_2: "Bird Dog Level 2",
  bd_level_3: "Bird Dog Level 3",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "capacity" ? "capacity" : "scorecard";

  const blocks = await getOpsBlocks("team.");

  const teammates = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(and(isNull(user.suspendedAt), isNull(user.deletedAt), ne(user.role, "bird_dog")))
    .orderBy(asc(user.name));

  // Bird dog top performers — used in the "Capacity" view as the brokerage's
  // analog of Founder OS's FSM Capacity (per-person workload).
  const topBirdDogs = await db
    .select({
      id: birdDogs.id,
      firstName: birdDogs.firstName,
      lastName: birdDogs.lastName,
      acquisitionLevel: birdDogs.acquisitionLevel,
      statusCode: birdDogs.statusCode,
    })
    .from(birdDogs)
    .where(isNull(birdDogs.deletedAt))
    .limit(8);

  return (
    <>
      <OpsHeader eyebrow="People" title="Team" />

      <div className="inline-flex rounded-full border border-border bg-background p-1 mb-6">
        <Link
          href={"/ops/team" as never}
          className={
            "rounded-full px-3.5 py-1 text-xs transition " +
            (view === "scorecard"
              ? "bg-foreground text-background font-semibold"
              : "text-foreground/70 hover:text-foreground")
          }
        >
          Scorecard
        </Link>
        <Link
          href={"/ops/team?view=capacity" as never}
          className={
            "rounded-full px-3.5 py-1 text-xs transition " +
            (view === "capacity"
              ? "bg-foreground text-background font-semibold"
              : "text-foreground/70 hover:text-foreground")
          }
        >
          Bird Dog Capacity
        </Link>
      </div>

      {view === "scorecard" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-foreground/[0.02]">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-muted font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-muted font-semibold">Role</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-muted font-semibold">Dept</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-muted font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-muted font-semibold">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {teammates.map((t) => {
                const deptScope = `team.dept.${t.id}`;
                const verdictScope = `team.verdict.${t.id}`;
                const dept = blocks.get(deptScope) ?? (t.role ? DEFAULT_DEPT[t.role] ?? "—" : "—");
                const verdictLabel = blocks.get(verdictScope) ?? "KEEP";
                return (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">{t.role ? ROLE_LABEL[t.role] ?? t.role : "—"}</td>
                    <td className="px-4 py-3">
                      <EditableBlock scope={deptScope} initial={dept} revalidate={REVALIDATE} />
                    </td>
                    <td className="px-4 py-3">Active</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider">
                        <EditableBlock scope={verdictScope} initial={verdictLabel} revalidate={REVALIDATE} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {topBirdDogs.map((bd) => {
            const name = [bd.firstName, bd.lastName].filter(Boolean).join(" ") || "(unnamed)";
            return (
              <div key={bd.id} className="rounded-xl border border-border bg-background p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-full bg-foreground/10 grid place-items-center text-sm font-semibold">
                      {(bd.firstName?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted font-medium">
                        {bd.acquisitionLevel ? `BD · ${bd.acquisitionLevel}` : "Bird Dog"}
                      </div>
                    </div>
                  </div>
                  <StatusPill tone="on_track">ON TRACK</StatusPill>
                </div>
                <div className="text-[11px] text-muted mb-3">
                  Status: <span className="text-foreground/80">{bd.statusCode ?? "—"}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <Tile big="0" label="LEADS" />
                  <Tile big="0" label="QUALIFIED" />
                  <Tile big="0" label="CLOSED" />
                </div>
              </div>
            );
          })}
          {topBirdDogs.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-foreground/[0.02] p-8 text-center text-sm text-muted">
              No bird dogs yet. Add them in <Link href="/bird-dogs" className="underline">Bird Dogs</Link>.
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Tile({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-md bg-foreground/[0.04] py-2">
      <div className="text-base font-bold tabular-nums">{big}</div>
      <div className="text-[9px] uppercase tracking-widest text-muted font-medium mt-0.5">{label}</div>
    </div>
  );
}
