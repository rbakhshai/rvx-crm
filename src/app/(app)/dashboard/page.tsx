import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PageShell } from "../page-shell";
import { LinkButton } from "@/components/button";
import {
  fetchAdminDashboard,
  fetchCloserDashboard,
  fetchBdManagerDashboard,
  fetchCfoDashboard,
  fetchDueDiligenceDashboard,
  fetchDefaultDashboard,
  fetchOpenTasksForMe,
  fetchDealStatusLabels,
} from "@/lib/dashboard-queries";
import {
  Widget,
  ListLink,
  EmptyHint,
  StatTile,
  PriorityBadge,
  StaleBadge,
  nameOf,
  money,
  moneyShort,
} from "./widgets";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const role = (session.user as { role?: string }).role ?? "viewer";
  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const greeting = roleGreeting(role);

  return (
    <PageShell
      title={`${greeting}, ${firstName}`}
      subtitle={roleSubtitle(role)}
    >
      <MyTasks userId={session.user.id} />

      {role === "admin" || role === "acquisitions_manager" ? (
        <AdminBoard />
      ) : role === "closer" ? (
        <CloserBoard userId={session.user.id} />
      ) : role === "bird_dog_manager" ? (
        <BdManagerBoard />
      ) : role === "cfo" ? (
        <CfoBoard />
      ) : role === "due_diligence" || role === "transaction_coord" || role === "underwriter" ? (
        <DueDiligenceBoard />
      ) : (
        <DefaultBoard />
      )}
    </PageShell>
  );
}

function roleGreeting(role: string): string {
  if (role === "admin" || role === "acquisitions_manager") return "Welcome back";
  if (role === "closer") return "Time to work the pipeline";
  if (role === "bird_dog_manager") return "Recruit & route";
  if (role === "cfo") return "Money view";
  if (role === "due_diligence" || role === "transaction_coord" || role === "underwriter") return "Deals in flight";
  return "Welcome";
}

function roleSubtitle(role: string): string {
  if (role === "admin" || role === "acquisitions_manager") return "Where to focus the team today.";
  if (role === "closer") return "Your stale deals, hot buyers, and pipeline at a glance.";
  if (role === "bird_dog_manager") return "Applications in queue and scouts to follow up with.";
  if (role === "cfo") return "Pipeline value, escrow activity, and POF on file.";
  if (role === "due_diligence" || role === "transaction_coord") return "Deals in DD/escrow and what's coming next.";
  return "Your CRM at a glance.";
}

// =====================================================
// My tasks (shown on every dashboard)
// =====================================================

async function MyTasks({ userId }: { userId: string }) {
  const tasks = await fetchOpenTasksForMe(userId, 5);
  if (tasks.length === 0) {
    return (
      <Widget title="Your open tasks" href="/tasks?view=mine_open" count={0}>
        <EmptyHint>You have no open tasks. Nice and clear.</EmptyHint>
      </Widget>
    );
  }
  return (
    <Widget title="Your open tasks" hint="Sorted by due date" href="/tasks?view=mine_open" count={tasks.length} className="mb-5">
      <ul className="divide-y divide-border">
        {tasks.map((t) => (
          <li key={t.id}>
            <ListLink
              href={`/${t.parentTable === "bird_dogs" ? "bird-dogs" : t.parentTable}/${t.parentId}`}
              primary={t.subject}
              secondary={t.dueAt ? `due ${new Date(t.dueAt).toLocaleDateString()}` : "no due date"}
              trailing={<span className="text-[10px] uppercase tracking-widest text-muted">{t.type}</span>}
            />
          </li>
        ))}
      </ul>
    </Widget>
  );
}

// =====================================================
// Reza / admin / AM board
// =====================================================

async function AdminBoard() {
  const data = await fetchAdminDashboard();
  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatTile label="New buyers (7d)" value={data.weeklyBuyersAdded} />
        <StatTile label="New deals (7d)" value={data.weeklyDealsAdded} />
        <StatTile label="Total POF on file" value={moneyShort(data.totalPof)} hint="across all buyers" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Widget title="🔥 Hot deals" hint="dealPriority = hot" href="/deals?priority=hot" count={data.hotDeals.length}>
          {data.hotDeals.length === 0 ? (
            <EmptyHint>No deals flagged hot.</EmptyHint>
          ) : (
            <ul className="divide-y divide-border">
              {data.hotDeals.map((d) => (
                <li key={d.id}>
                  <ListLink
                    href={`/deals/${d.id}`}
                    primary={d.name ?? d.parkAddress ?? "(unnamed)"}
                    secondary={[d.parkState, money(d.listPrice ?? null)].filter(Boolean).join(" · ")}
                  />
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="New buyer leads" hint="status = new, awaiting connect" href="/contacts?status=new_waiting_to_connect" count={data.newBuyerLeads.length}>
          {data.newBuyerLeads.length === 0 ? (
            <EmptyHint>No new leads waiting.</EmptyHint>
          ) : (
            <ul className="divide-y divide-border">
              {data.newBuyerLeads.map((c) => (
                <li key={c.id}>
                  <ListLink
                    href={`/contacts/${c.id}`}
                    primary={nameOf(c.firstName, c.lastName)}
                    secondary={c.email}
                    trailing={<StaleBadge since={c.createdAt} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Stale deals across team" hint={`closer touch > 7 days, in negotiation`} href="/deals" count={data.staleDealsAcrossTeam.length}>
          {data.staleDealsAcrossTeam.length === 0 ? (
            <EmptyHint>Nothing stale. Team is on it.</EmptyHint>
          ) : (
            <ul className="divide-y divide-border">
              {data.staleDealsAcrossTeam.map((d) => (
                <li key={d.id}>
                  <ListLink
                    href={`/deals/${d.id}`}
                    primary={d.name ?? d.parkAddress ?? "(unnamed)"}
                    secondary={<PriorityBadge priority={d.dealPriority} />}
                    trailing={<StaleBadge since={d.closerLastTouch} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Bird Dog applications" hint="status: 1.0 HOLD — needs review" href="/bird-dogs?status=hold_see_notes" count={data.bdAppQueue.length}>
          {data.bdAppQueue.length === 0 ? (
            <EmptyHint>No applications waiting.</EmptyHint>
          ) : (
            <ul className="divide-y divide-border">
              {data.bdAppQueue.map((b) => (
                <li key={b.id}>
                  <ListLink
                    href={`/bird-dogs/${b.id}`}
                    primary={nameOf(b.firstName, b.lastName)}
                    secondary={b.email}
                    trailing={<StaleBadge since={b.createdAt} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </div>
    </>
  );
}

// =====================================================
// Marco / closer board
// =====================================================

async function CloserBoard({ userId }: { userId: string }) {
  const [data, statusLabels] = await Promise.all([fetchCloserDashboard(userId), fetchDealStatusLabels()]);

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatTile label="My active deals" value={data.myDealsCount} />
        <StatTile label="Stale (7+ days)" value={data.myStaleDeals.length} hint="needs touch" />
        <StatTile label="Hot tier-1 buyers" value={data.hotTier1Buyers.length} hint="for outreach inspiration" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Widget title="Deals needing your touch" hint="closer_last_touch > 7 days" count={data.myStaleDeals.length}>
          {data.myStaleDeals.length === 0 ? (
            <EmptyHint>Nothing stale on your plate. Nice.</EmptyHint>
          ) : (
            <ul className="divide-y divide-border">
              {data.myStaleDeals.map((d) => (
                <li key={d.id}>
                  <ListLink
                    href={`/deals/${d.id}`}
                    primary={d.name ?? d.parkAddress ?? "(unnamed)"}
                    secondary={[d.parkState, <PriorityBadge key="p" priority={d.dealPriority} />].filter(Boolean) as never}
                    trailing={<StaleBadge since={d.closerLastTouch} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Hot tier-1 buyers" hint="active 🔥, top-shelf book" href="/contacts?status=active_looking_hot&tier=tier_1_experienced_rvp_network" count={data.hotTier1Buyers.length}>
          {data.hotTier1Buyers.length === 0 ? (
            <EmptyHint>No tier-1 hot buyers right now.</EmptyHint>
          ) : (
            <ul className="divide-y divide-border">
              {data.hotTier1Buyers.map((c) => (
                <li key={c.id}>
                  <ListLink
                    href={`/contacts/${c.id}`}
                    primary={nameOf(c.firstName, c.lastName)}
                    secondary={c.email}
                    trailing={c.pofAmount ? <span className="text-xs text-muted tabular-nums">{moneyShort(c.pofAmount)}</span> : null}
                  />
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="My deals by stage" hint="active pipeline" className="lg:col-span-2">
          {data.myDealsByStage.length === 0 ? (
            <EmptyHint>No deals owned yet. Hit + New deal to get started.</EmptyHint>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {data.myDealsByStage.map((s) => (
                <li key={s.statusCode} className="flex items-center justify-between gap-3 py-1 border-b border-border last:border-b-0">
                  <Link href={`/deals?status=${s.statusCode}`} className="text-foreground/80 hover:text-foreground truncate">
                    {statusLabels.get(s.statusCode ?? "") ?? s.statusCode}
                  </Link>
                  <span className="text-xs text-muted tabular-nums">{s.n}</span>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </div>
    </>
  );
}

// =====================================================
// Erica / BD manager board
// =====================================================

async function BdManagerBoard() {
  const data = await fetchBdManagerDashboard();
  const statusLookup = new Map(data.statusLookup.map((s) => [s.code, s]));

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatTile label="Total bird dogs" value={data.totalBds} />
        <StatTile label="New applications" value={data.newApplications.length} hint="awaiting your review" />
        <StatTile label="Active scouts" value={data.activeBds.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Widget title="New applications" hint="status: 1.0 HOLD" href="/bird-dogs?status=hold_see_notes" count={data.newApplications.length}>
          {data.newApplications.length === 0 ? (
            <EmptyHint>No applications waiting.</EmptyHint>
          ) : (
            <ul className="divide-y divide-border">
              {data.newApplications.map((b) => (
                <li key={b.id}>
                  <ListLink
                    href={`/bird-dogs/${b.id}`}
                    primary={nameOf(b.firstName, b.lastName)}
                    secondary={b.email}
                    trailing={<StaleBadge since={b.createdAt} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Active scouts — check in" hint="Sorted by least-recently-active" count={data.activeBds.length}>
          {data.activeBds.length === 0 ? (
            <EmptyHint>No active scouts yet.</EmptyHint>
          ) : (
            <ul className="divide-y divide-border">
              {data.activeBds.map((b) => (
                <li key={b.id}>
                  <ListLink
                    href={`/bird-dogs/${b.id}`}
                    primary={nameOf(b.firstName, b.lastName)}
                    secondary={b.email}
                    trailing={<StaleBadge since={b.lastActivityAt} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Pipeline by stage" hint="All bird dogs, by onboarding status" className="lg:col-span-2">
          {data.statusBreakdown.length === 0 ? (
            <EmptyHint>No bird dogs yet.</EmptyHint>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {data.statusBreakdown
                .slice()
                .sort((a, b) => (statusLookup.get(a.statusCode ?? "")?.sortOrder ?? 999) - (statusLookup.get(b.statusCode ?? "")?.sortOrder ?? 999))
                .map((s) => (
                  <li key={s.statusCode} className="flex items-center justify-between gap-3 py-1 border-b border-border last:border-b-0">
                    <Link href={`/bird-dogs?status=${s.statusCode}`} className="text-foreground/80 hover:text-foreground truncate">
                      {statusLookup.get(s.statusCode ?? "")?.label ?? s.statusCode}
                    </Link>
                    <span className="text-xs text-muted tabular-nums">{s.n}</span>
                  </li>
                ))}
            </ul>
          )}
        </Widget>
      </div>
    </>
  );
}

// =====================================================
// Kevin / CFO board
// =====================================================

async function CfoBoard() {
  const data = await fetchCfoDashboard();
  return (
    <>
      <div className="grid sm:grid-cols-4 gap-4 mb-5">
        <StatTile label="Pipeline value" value={moneyShort(data.pipelineValue)} hint="agreed prices on active deals" />
        <StatTile label="Total POF on file" value={moneyShort(data.totalPof)} hint="across all buyers" />
        <StatTile label="Closed 30 days" value={data.closedThisMonth.count} hint={`${moneyShort(data.closedThisMonth.total)} GMV`} />
        <StatTile label="In escrow" value={data.dealsInEscrow.length} />
      </div>

      <Widget title="Deals in escrow" hint="Soonest COE first" count={data.dealsInEscrow.length}>
        {data.dealsInEscrow.length === 0 ? (
          <EmptyHint>Nothing in escrow right now.</EmptyHint>
        ) : (
          <ul className="divide-y divide-border">
            {data.dealsInEscrow.map((d) => (
              <li key={d.id}>
                <ListLink
                  href={`/deals/${d.id}`}
                  primary={d.name ?? d.parkAddress ?? "(unnamed)"}
                  secondary={d.psaCoeDate ? `COE ${new Date(d.psaCoeDate).toLocaleDateString()}` : "no COE date"}
                  trailing={<span className="text-xs text-muted tabular-nums">{money(d.agreedPurchasePrice ?? null)}</span>}
                />
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </>
  );
}

// =====================================================
// Kerry / DD board (also TC, UW)
// =====================================================

async function DueDiligenceBoard() {
  const data = await fetchDueDiligenceDashboard();
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Widget title="Deals in DD" hint="Sorted by inspection-period end" count={data.inDd.length}>
        {data.inDd.length === 0 ? (
          <EmptyHint>Nothing in DD right now.</EmptyHint>
        ) : (
          <ul className="divide-y divide-border">
            {data.inDd.map((d) => (
              <li key={d.id}>
                <ListLink
                  href={`/deals/${d.id}`}
                  primary={d.name ?? d.parkAddress ?? "(unnamed)"}
                  secondary={d.inspectionPeriodEnd ? `inspection ends ${new Date(d.inspectionPeriodEnd).toLocaleDateString()}` : "no inspection-end date"}
                />
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <Widget title="Awaiting DD start" hint="PSA accepted or dispo initiated" count={data.awaitingDdStart.length}>
        {data.awaitingDdStart.length === 0 ? (
          <EmptyHint>Nothing awaiting DD start.</EmptyHint>
        ) : (
          <ul className="divide-y divide-border">
            {data.awaitingDdStart.map((d) => (
              <li key={d.id}>
                <ListLink href={`/deals/${d.id}`} primary={d.name ?? d.parkAddress ?? "(unnamed)"} secondary={d.statusCode ?? ""} />
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </div>
  );
}

// =====================================================
// Default (viewer or unrecognized role)
// =====================================================

async function DefaultBoard() {
  const data = await fetchDefaultDashboard();
  return (
    <>
      <div className="grid sm:grid-cols-4 gap-4 mb-5">
        <StatTile label="Buyers" value={data.contactsCount} />
        <StatTile label="Deals" value={data.dealsCount} />
        <StatTile label="Sellers" value={data.companiesCount} />
        <StatTile label="Bird Dogs" value={data.bdCount} />
      </div>
      <Widget title="Get oriented" hint="Use the sidebar to explore each entity.">
        <ul className="space-y-1.5 text-sm">
          <li><Link href="/contacts" className="hover:underline">Browse buyers →</Link></li>
          <li><Link href="/deals" className="hover:underline">Browse deals →</Link></li>
          <li><Link href="/deals/board" className="hover:underline">Pipeline board →</Link></li>
          <li><Link href="/bird-dogs" className="hover:underline">Bird Dogs →</Link></li>
        </ul>
      </Widget>
      <div className="mt-5">
        <LinkButton href="/dashboard" variant="ghost" size="sm">Refresh</LinkButton>
      </div>
    </>
  );
}
