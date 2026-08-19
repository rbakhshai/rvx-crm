/**
 * Due Diligence — redesigned with sticky countdown header + 7 workstream tabs.
 * Sticky header carries park name, days-to-inspection-end, days-to-COE, and
 * the four KPI stats so they're always visible while scrolling.
 *
 * Tabs (URL-driven via ?tab=):
 *   overview  — at-a-glance: stats + open issues + checklist top-of-mind
 *   checklist — 46-item template grouped into 9 sections
 *   money     — CapX + NOI plan + Rent roll
 *   physical  — Walk-throughs + Park-owned homes + Buildings
 *   market    — Comparables (RV/MH parks, apartments, SFH)
 *   issues    — Negotiation items (full view)
 *   roster    — DD Contacts (purchase, govt, utility, vendor, market)
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  deals,
  ddChecklistItems,
  ddCapxItems,
  ddWalkThroughs,
  ddNegotiationItems,
  ddNoiItems,
  ddParkOwnedHomes,
  ddRentRollEntries,
  ddComparables,
  ddContacts,
  user as userTable,
} from "@/db/schema";
import { PageShell } from "../../../page-shell";
import { LinkButton } from "@/components/button";
import { Badge } from "@/components/badge";
import { Avatar } from "@/components/avatar";
import { DD_SECTION_LABELS } from "@/lib/dd-checklist-template";
import { requirePagePermission } from "@/lib/page-guard";
import {
  ensureDdChecklistAction,
  toggleDdChecklistItemAction,
  updateDdChecklistItemAction,
  addCapxItemAction,
  deleteCapxItemAction,
  addWalkThroughAction,
  deleteWalkThroughAction,
  addNegotiationItemAction,
  resolveNegotiationItemAction,
  deleteNegotiationItemAction,
  addNoiItemAction,
  deleteNoiItemAction,
  addParkOwnedHomeAction,
  deleteParkOwnedHomeAction,
  addRentRollEntryAction,
  deleteRentRollEntryAction,
  addComparableAction,
  deleteComparableAction,
  addDdContactAction,
  deleteDdContactAction,
} from "./actions";

// ============================================================================
// Style constants
// ============================================================================

const fieldStyle =
  "w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const labelStyle = "text-[10px] uppercase tracking-widest text-muted font-medium block mb-0.5";
const smallBtn =
  "rounded-md border border-border bg-foreground/[0.04] px-2.5 py-1 text-xs font-medium hover:bg-foreground/[0.08] transition";
const primaryBtn =
  "rounded-md bg-primary text-primary-foreground px-3 py-1 text-xs font-medium hover:opacity-90 transition";
const dangerBtn =
  "text-red-600 hover:text-red-700 text-xs font-medium underline-offset-2 hover:underline";

const DAY_MS = 24 * 60 * 60 * 1000;

function money(v: string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString()}`;
}

function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(date).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / DAY_MS);
}

// ============================================================================
// Sticky header — countdowns + KPI bar
// ============================================================================

function Countdown({ label, days }: { label: string; days: number | null }) {
  if (days === null) {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</span>
        <span className="text-xs text-muted">— not set</span>
      </div>
    );
  }
  const tone =
    days < 0 ? "text-red-700" :
    days <= 7 ? "text-amber-700" :
    days <= 21 ? "text-foreground" : "text-foreground/70";
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</span>
      <span className={`text-base font-semibold tabular-nums ${tone}`}>
        {days < 0 ? `${-days}d overdue` : days === 0 ? "today" : `${days}d`}
      </span>
    </div>
  );
}

function MiniStat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: "green" | "amber" }) {
  const valueClass = accent === "green" ? "text-green-700" : accent === "amber" ? "text-amber-700" : "text-foreground";
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-muted font-medium">{label}</div>
      <div className={`text-lg font-semibold tabular-nums leading-tight ${valueClass}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted leading-tight">{hint}</div>}
    </div>
  );
}

// ============================================================================
// Tab nav
// ============================================================================

const TABS = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "checklist", label: "Checklist", icon: "✓" },
  { key: "money", label: "Money", icon: "💵" },
  { key: "physical", label: "Physical", icon: "🏗" },
  { key: "market", label: "Market", icon: "📈" },
  { key: "issues", label: "Issues", icon: "⚠️" },
  { key: "roster", label: "Roster", icon: "👥" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isTabKey(v: string | undefined): v is TabKey {
  return !!v && TABS.some((t) => t.key === v);
}

function TabNav({
  active,
  dealId,
  counts,
}: {
  active: TabKey;
  dealId: string;
  counts: Record<string, number | string>;
}) {
  return (
    <div className="-mx-8 px-8 border-b border-border bg-background sticky top-12 z-20">
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {TABS.map((t) => {
          const isActive = active === t.key;
          const count = counts[t.key];
          return (
            <Link
              key={t.key}
              href={`/deals/${dealId}/due-diligence?tab=${t.key}` as never}
              className={
                "shrink-0 inline-flex items-baseline gap-1.5 px-3 py-2.5 text-sm border-b-2 transition " +
                (isActive
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted hover:text-foreground hover:bg-foreground/[0.02]")
              }
            >
              <span>{t.label}</span>
              {count != null && count !== "" && (
                <span className={"text-[10px] tabular-nums " + (isActive ? "text-muted" : "text-muted/70")}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

export default async function DueDiligencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePagePermission("view_contacts");
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = isTabKey(rawTab) ? rawTab : "overview";

  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) notFound();

  // Seed checklist on first visit
  await ensureDdChecklistAction(id);

  const [
    checklist,
    capx,
    walks,
    negItems,
    noiItems,
    pohItems,
    rentRoll,
    comparables,
    contacts,
    owners,
  ] = await Promise.all([
    db.select().from(ddChecklistItems).where(eq(ddChecklistItems.dealId, id)).orderBy(asc(ddChecklistItems.sortOrder)),
    db.select().from(ddCapxItems).where(eq(ddCapxItems.dealId, id)).orderBy(asc(ddCapxItems.createdAt)),
    db.select().from(ddWalkThroughs).where(eq(ddWalkThroughs.dealId, id)).orderBy(desc(ddWalkThroughs.inspectedAt)),
    db.select().from(ddNegotiationItems).where(eq(ddNegotiationItems.dealId, id)).orderBy(asc(ddNegotiationItems.createdAt)),
    db.select().from(ddNoiItems).where(eq(ddNoiItems.dealId, id)).orderBy(asc(ddNoiItems.direction), asc(ddNoiItems.createdAt)),
    db.select().from(ddParkOwnedHomes).where(eq(ddParkOwnedHomes.dealId, id)).orderBy(asc(ddParkOwnedHomes.category), asc(ddParkOwnedHomes.spaceNumberOrType)),
    db.select().from(ddRentRollEntries).where(eq(ddRentRollEntries.dealId, id)).orderBy(desc(ddRentRollEntries.asOfDate), asc(ddRentRollEntries.spaceNumber)),
    db.select().from(ddComparables).where(eq(ddComparables.dealId, id)).orderBy(asc(ddComparables.type), asc(ddComparables.createdAt)),
    db.select().from(ddContacts).where(eq(ddContacts.dealId, id)).orderBy(asc(ddContacts.category), asc(ddContacts.role)),
    // Owner avatars for the sticky header
    (() => {
      const ids = [deal.ownerId, deal.opsOwnerId].filter((x): x is string => !!x);
      return ids.length
        ? db.select({ id: userTable.id, name: userTable.name }).from(userTable).where(inArray(userTable.id, ids))
        : Promise.resolve([] as Array<{ id: string; name: string }>);
    })(),
  ]);

  // Aggregations
  const totalItems = checklist.length;
  const doneItems = checklist.filter((i) => i.doneAt).length;
  const pctDone = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  const noiIncome = noiItems.filter((i) => i.direction === "increase_income");
  const noiExpense = noiItems.filter((i) => i.direction === "reduce_expense");
  const totalNoiImpact = noiItems.reduce((sum, i) => sum + Number(i.noiImpact ?? 0), 0);
  const totalCapx = capx.reduce((sum, i) => sum + Number(i.expectedCost ?? 0), 0);

  const openNegItems = negItems.filter((i) => !i.resolvedAt);

  const ownerMap = new Map(owners.map((u) => [u.id, u.name]));
  const ownerName = deal.ownerId ? ownerMap.get(deal.ownerId) : null;
  const opsOwnerName = deal.opsOwnerId ? ownerMap.get(deal.opsOwnerId) : null;

  // Per-tab counts
  const counts: Record<TabKey, number | string> = {
    overview: "",
    checklist: `${doneItems}/${totalItems}`,
    money: `${capx.length + noiItems.length + rentRoll.length}`,
    physical: `${walks.length + pohItems.length}`,
    market: `${comparables.length}`,
    issues: `${openNegItems.length}`,
    roster: `${contacts.length}`,
  };

  const title = deal.name || deal.parkAddress || "(unnamed deal)";
  const loc = [deal.parkCity, deal.parkState].filter(Boolean).join(", ");
  const daysToInspectionEnd = daysUntil(deal.inspectionPeriodEnd);
  const daysToCOE = daysUntil(deal.psaCoeDate);

  return (
    <PageShell
      title="Due Diligence"
      subtitle={title}
      width="full"
      action={
        <div className="flex gap-2 items-center">
          <Link href={`/deals/${id}` as never} className="text-sm text-muted hover:text-foreground self-center">
            ← Back to deal
          </Link>
          <LinkButton href={`/deals/${id}/edit`} variant="secondary" size="sm">
            Edit deal
          </LinkButton>
        </div>
      }
    >
      {/* ====== Sticky countdown header ====== */}
      <div className="-mx-8 px-8 sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between gap-6 py-3 flex-wrap">
          <div className="flex items-center gap-5 flex-wrap">
            <Countdown label="Inspection ends" days={daysToInspectionEnd} />
            <div className="h-6 w-px bg-border" />
            <Countdown label="COE" days={daysToCOE} />
            {loc && (
              <>
                <div className="h-6 w-px bg-border" />
                <span className="text-xs text-muted">{loc}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {deal.ownerId && (
              <Avatar name={ownerName ?? "?"} id={deal.ownerId} size="sm" title={ownerName ? `Owner: ${ownerName}` : "Owner"} />
            )}
            {deal.opsOwnerId && deal.opsOwnerId !== deal.ownerId && (
              <Avatar name={opsOwnerName ?? "?"} id={deal.opsOwnerId} size="sm" title={opsOwnerName ? `Ops owner: ${opsOwnerName}` : "Ops"} />
            )}
          </div>
        </div>

        {/* KPI mini-bar */}
        <div className="grid sm:grid-cols-4 gap-6 py-3 border-t border-border">
          <MiniStat
            label="Checklist"
            value={`${doneItems}/${totalItems}`}
            hint={`${pctDone}% complete`}
          />
          <MiniStat
            label="CapX budget"
            value={totalCapx ? `$${(totalCapx / 1000).toFixed(0)}K` : "—"}
            hint={`${capx.length} item${capx.length === 1 ? "" : "s"}`}
          />
          <MiniStat
            label="NOI impact"
            value={totalNoiImpact ? `+$${(totalNoiImpact / 1000).toFixed(0)}K` : "—"}
            hint={`${noiIncome.length} income · ${noiExpense.length} expense`}
            accent={totalNoiImpact > 0 ? "green" : undefined}
          />
          <MiniStat
            label="Open issues"
            value={`${openNegItems.length}`}
            hint={`${negItems.length} total`}
            accent={openNegItems.length > 0 ? "amber" : undefined}
          />
        </div>
      </div>

      {/* ====== Tab nav ====== */}
      <TabNav active={tab} dealId={id} counts={counts} />

      {/* ====== Tab content ====== */}
      <div className="mt-6">
        {tab === "overview" && (
          <OverviewTab
            doneItems={doneItems}
            totalItems={totalItems}
            pctDone={pctDone}
            checklist={checklist}
            openNegItems={openNegItems}
            walks={walks}
          />
        )}

        {tab === "checklist" && (
          <ChecklistTab checklist={checklist} dealId={id} />
        )}

        {tab === "money" && (
          <MoneyTab
            capx={capx}
            totalCapx={totalCapx}
            noiIncome={noiIncome}
            noiExpense={noiExpense}
            rentRoll={rentRoll}
            dealId={id}
          />
        )}

        {tab === "physical" && (
          <PhysicalTab walks={walks} pohItems={pohItems} dealId={id} />
        )}

        {tab === "market" && (
          <MarketTab comparables={comparables} dealId={id} />
        )}

        {tab === "issues" && (
          <IssuesTab negItems={negItems} dealId={id} />
        )}

        {tab === "roster" && (
          <RosterTab contacts={contacts} dealId={id} />
        )}
      </div>
    </PageShell>
  );
}

// ============================================================================
// Tab: Overview
// ============================================================================

function OverviewTab({
  doneItems,
  totalItems,
  pctDone,
  checklist,
  openNegItems,
  walks,
}: {
  doneItems: number;
  totalItems: number;
  pctDone: number;
  checklist: Array<{ id: string; label: string; doneAt: Date | null; scheduledCompletion: string | null }>;
  openNegItems: Array<{ id: string; problem: string; estimatedCost: string | null; timeline: string | null }>;
  walks: Array<{ id: string; inspectedAt: string; problemsFound: string | null }>;
}) {
  const upcoming = checklist
    .filter((i) => !i.doneAt && i.scheduledCompletion)
    .sort((a, b) => (a.scheduledCompletion! < b.scheduledCompletion! ? -1 : 1))
    .slice(0, 5);
  const recentWalks = walks.slice(0, 3);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Progress bar */}
      <div className="lg:col-span-2 rounded-xl border border-border p-5 bg-background">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-sm font-semibold">Checklist progress</h3>
          <span className="text-xs text-muted">{doneItems} of {totalItems} items done</span>
        </div>
        <div className="h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pctDone}%` }} />
        </div>
        <div className="mt-2 text-xs text-muted">{pctDone}% complete · jump to <Link href={"?tab=checklist" as never} className="text-primary hover:underline">Checklist tab</Link> to mark items done.</div>
      </div>

      {/* Open issues */}
      <div className="rounded-xl border border-border p-5 bg-background">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Open issues</h3>
          <Link href={"?tab=issues" as never} className="text-xs text-muted hover:text-foreground">
            {openNegItems.length} total →
          </Link>
        </div>
        {openNegItems.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">No open negotiation items. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {openNegItems.slice(0, 5).map((n) => (
              <li key={n.id} className="text-xs border border-border rounded-md px-3 py-2 flex items-center justify-between gap-3">
                <span className="flex-1 truncate font-medium">{n.problem}</span>
                <span className="text-muted shrink-0">{n.estimatedCost ? money(n.estimatedCost) : ""} {n.timeline ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming due dates */}
      <div className="rounded-xl border border-border p-5 bg-background">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Due soon</h3>
          <Link href={"?tab=checklist" as never} className="text-xs text-muted hover:text-foreground">
            See all →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">No scheduled completion dates set on checklist items.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((i) => {
              const days = daysUntil(i.scheduledCompletion);
              const tone = days != null && days < 0 ? "danger" : days != null && days <= 7 ? "warning" : "muted";
              return (
                <li key={i.id} className="text-xs flex items-center justify-between gap-3 border border-border rounded-md px-3 py-2">
                  <span className="truncate flex-1">{i.label}</span>
                  <Badge tone={tone}>{days != null && days < 0 ? `${-days}d late` : days === 0 ? "today" : `${days}d`}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Recent walk-throughs */}
      <div className="lg:col-span-2 rounded-xl border border-border p-5 bg-background">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Recent walk-throughs</h3>
          <Link href={"?tab=physical" as never} className="text-xs text-muted hover:text-foreground">
            See all →
          </Link>
        </div>
        {recentWalks.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">No walk-throughs logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentWalks.map((w) => (
              <li key={w.id} className="text-xs border border-border rounded-md px-3 py-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold">{w.inspectedAt}</span>
                </div>
                {w.problemsFound && <div className="text-muted truncate">{w.problemsFound}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Tab: Checklist
// ============================================================================

function ChecklistTab({
  checklist,
  dealId,
}: {
  checklist: Array<{
    id: string;
    section: keyof typeof DD_SECTION_LABELS;
    label: string;
    doneAt: Date | null;
    dateOrdered: string | null;
    scheduledCompletion: string | null;
    notes: string | null;
    artifactUrl: string | null;
  }>;
  dealId: string;
}) {
  const bySection = new Map<keyof typeof DD_SECTION_LABELS, typeof checklist>();
  for (const item of checklist) {
    const arr = bySection.get(item.section) ?? [];
    arr.push(item);
    bySection.set(item.section, arr);
  }
  return (
    <div className="space-y-6">
      {(Object.keys(DD_SECTION_LABELS) as Array<keyof typeof DD_SECTION_LABELS>).map((section) => {
        const items = bySection.get(section) ?? [];
        if (items.length === 0) return null;
        const sectionDone = items.filter((i) => i.doneAt).length;
        return (
          <div key={section}>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                {DD_SECTION_LABELS[section]}
              </h3>
              <span className="text-[11px] text-muted">{sectionDone}/{items.length}</span>
            </div>
            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-background">
              {items.map((item) => (
                <ChecklistRow key={item.id} item={item} dealId={dealId} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Tab: Money — CapX + NOI + Rent roll
// ============================================================================

function MoneyTab({
  capx,
  totalCapx,
  noiIncome,
  noiExpense,
  rentRoll,
  dealId,
}: {
  capx: Array<{ id: string; type: string; description: string | null; expectedCost: string | null; timeline: string | null }>;
  totalCapx: number;
  noiIncome: Array<{ id: string; item: string; noiImpact: string | null; timeline: string | null; implementedAt: Date | null }>;
  noiExpense: Array<{ id: string; item: string; noiImpact: string | null; timeline: string | null; implementedAt: Date | null }>;
  rentRoll: Array<{
    id: string; asOfDate: string; spaceNumber: string | null; residentName: string | null;
    lotRent: string | null; rentalHomeRent: string | null; otherCharges: string | null;
    delinquentBalance: string | null; moveInDate: string | null;
  }>;
  dealId: string;
}) {
  const latestRentRollDate = rentRoll[0]?.asOfDate ?? null;
  const latestRentRoll = latestRentRollDate ? rentRoll.filter((r) => r.asOfDate === latestRentRollDate) : [];

  return (
    <div className="space-y-8">
      {/* CapX */}
      <section>
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Capital expenditures</h3>
          <span className="text-xs text-muted">{capx.length} item{capx.length === 1 ? "" : "s"} · {totalCapx ? `$${totalCapx.toLocaleString()}` : "$0"}</span>
        </header>
        {capx.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden mb-3 bg-background">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border">
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Expected $</th>
                  <th className="px-3 py-2 text-left font-medium">Timeline</th>
                  <th className="px-3 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {capx.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2"><Badge>{c.type.replace(/_/g, " ")}</Badge></td>
                    <td className="px-3 py-2">{c.description ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(c.expectedCost)}</td>
                    <td className="px-3 py-2">{c.timeline ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <form action={deleteCapxItemAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="dealId" value={dealId} />
                        <button type="submit" className={dangerBtn}>Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form action={addCapxItemAction} className="grid grid-cols-6 gap-2 items-end p-3 rounded-lg border border-dashed border-border bg-foreground/[0.015]">
          <input type="hidden" name="dealId" value={dealId} />
          <div className="col-span-2">
            <label className={labelStyle}>Type</label>
            <select name="type" className={fieldStyle} defaultValue="other">
              <option value="roads">Roads</option>
              <option value="water_lines">Water lines</option>
              <option value="sewer_lines">Sewer lines</option>
              <option value="gas">Gas</option>
              <option value="electricity">Electricity</option>
              <option value="landscaping">Landscaping</option>
              <option value="buildings">Buildings</option>
              <option value="park_owned_homes">Park-owned homes</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelStyle}>Description</label>
            <input name="description" className={fieldStyle} placeholder="Repave entrance loop" />
          </div>
          <div>
            <label className={labelStyle}>Expected $</label>
            <input name="expectedCost" type="number" step="0.01" className={fieldStyle} placeholder="15000" />
          </div>
          <div className="flex gap-2 items-end">
            <input name="timeline" className={fieldStyle} placeholder="Q1" />
            <button type="submit" className={primaryBtn}>Add</button>
          </div>
        </form>
      </section>

      {/* NOI plan */}
      <section>
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">NOI maximization plan</h3>
          <span className="text-xs font-semibold text-green-700">
            {noiIncome.length + noiExpense.length > 0 && (noiIncome.reduce((s, i) => s + Number(i.noiImpact ?? 0), 0) + noiExpense.reduce((s, i) => s + Number(i.noiImpact ?? 0), 0) > 0)
              ? `+$${(noiIncome.reduce((s, i) => s + Number(i.noiImpact ?? 0), 0) + noiExpense.reduce((s, i) => s + Number(i.noiImpact ?? 0), 0)).toLocaleString()} annual impact`
              : ""}
          </span>
        </header>
        <div className="grid md:grid-cols-2 gap-6">
          <NoiColumn title="Increase income" items={noiIncome} dealId={dealId} direction="increase_income" accent="green" />
          <NoiColumn title="Reduce expenses" items={noiExpense} dealId={dealId} direction="reduce_expense" accent="orange" />
        </div>
      </section>

      {/* Rent roll */}
      <section>
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Rent roll</h3>
          <span className="text-xs text-muted">
            {latestRentRollDate
              ? `${latestRentRoll.length} space${latestRentRoll.length === 1 ? "" : "s"} as of ${latestRentRollDate}`
              : "no entries"}
          </span>
        </header>
        {latestRentRoll.length > 0 && (
          <div className="rounded-lg border border-border overflow-x-auto mb-3 bg-background">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border">
                  <th className="px-3 py-2 text-left font-medium">Space</th>
                  <th className="px-2 py-2 text-left font-medium">Resident</th>
                  <th className="px-2 py-2 text-right font-medium">Lot rent</th>
                  <th className="px-2 py-2 text-right font-medium">Home rent</th>
                  <th className="px-2 py-2 text-right font-medium">Other</th>
                  <th className="px-2 py-2 text-right font-medium">Delinquent</th>
                  <th className="px-2 py-2 text-left font-medium">Move-in</th>
                  <th className="px-3 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {latestRentRoll.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-medium">{r.spaceNumber ?? "—"}</td>
                    <td className="px-2 py-2">{r.residentName ?? "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(r.lotRent)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(r.rentalHomeRent)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(r.otherCharges)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {r.delinquentBalance && Number(r.delinquentBalance) > 0 ? (
                        <span className="text-red-700">{money(r.delinquentBalance)}</span>
                      ) : "—"}
                    </td>
                    <td className="px-2 py-2 text-muted">{r.moveInDate ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <form action={deleteRentRollEntryAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="dealId" value={dealId} />
                        <button type="submit" className={dangerBtn}>×</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form action={addRentRollEntryAction} className="grid grid-cols-8 gap-2 items-end p-3 rounded-lg border border-dashed border-border bg-foreground/[0.015]">
          <input type="hidden" name="dealId" value={dealId} />
          <div>
            <label className={labelStyle}>As-of date *</label>
            <input name="asOfDate" type="date" required className={fieldStyle} defaultValue={latestRentRollDate ?? ""} />
          </div>
          <div>
            <label className={labelStyle}>Space #</label>
            <input name="spaceNumber" className={fieldStyle} placeholder="12" />
          </div>
          <div className="col-span-2">
            <label className={labelStyle}>Resident</label>
            <input name="residentName" className={fieldStyle} placeholder="J. Smith" />
          </div>
          <div>
            <label className={labelStyle}>Lot rent</label>
            <input name="lotRent" type="number" step="0.01" className={fieldStyle} />
          </div>
          <div>
            <label className={labelStyle}>Home rent</label>
            <input name="rentalHomeRent" type="number" step="0.01" className={fieldStyle} />
          </div>
          <div>
            <label className={labelStyle}>Delinquent</label>
            <input name="delinquentBalance" type="number" step="0.01" className={fieldStyle} />
          </div>
          <button type="submit" className={primaryBtn}>Add entry</button>
        </form>
      </section>
    </div>
  );
}

// ============================================================================
// Tab: Physical — Walk-throughs + POH + Buildings
// ============================================================================

function PhysicalTab({
  walks,
  pohItems,
  dealId,
}: {
  walks: Array<{ id: string; inspectedAt: string; problemsFound: string | null; problemsCorrected: string | null }>;
  pohItems: Array<{
    id: string; category: "park_owned_home" | "building_or_structure";
    spaceNumberOrType: string | null; status: string | null; year: string | null;
    size: string | null; condition: string | null; marketValue: string | null;
    listOfRepairs: string | null; costOfRepairs: string | null; use: string | null;
  }>;
  dealId: string;
}) {
  const homes = pohItems.filter((i) => i.category === "park_owned_home");
  const buildings = pohItems.filter((i) => i.category === "building_or_structure");

  return (
    <div className="space-y-8">
      <section>
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Walk-throughs</h3>
          <span className="text-xs text-muted">{walks.length} log{walks.length === 1 ? "" : "s"}</span>
        </header>
        {walks.length > 0 && (
          <div className="space-y-2 mb-3">
            {walks.map((w) => (
              <div key={w.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{w.inspectedAt}</span>
                  <form action={deleteWalkThroughAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="dealId" value={dealId} />
                    <button type="submit" className={dangerBtn}>Delete</button>
                  </form>
                </div>
                {w.problemsFound && (
                  <div className="text-xs mb-1.5">
                    <span className="text-muted">Problems: </span>
                    <span className="whitespace-pre-wrap">{w.problemsFound}</span>
                  </div>
                )}
                {w.problemsCorrected && (
                  <div className="text-xs">
                    <span className="text-muted">Corrected: </span>
                    <span className="whitespace-pre-wrap">{w.problemsCorrected}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <form action={addWalkThroughAction} className="grid grid-cols-4 gap-2 items-end p-3 rounded-lg border border-dashed border-border bg-foreground/[0.015]">
          <input type="hidden" name="dealId" value={dealId} />
          <div>
            <label className={labelStyle}>Date inspected *</label>
            <input name="inspectedAt" type="date" required className={fieldStyle} />
          </div>
          <div>
            <label className={labelStyle}>Problems found</label>
            <input name="problemsFound" className={fieldStyle} placeholder="Loose siding, pad #12" />
          </div>
          <div>
            <label className={labelStyle}>Problems corrected</label>
            <input name="problemsCorrected" className={fieldStyle} placeholder="Re-secured 5/15" />
          </div>
          <button type="submit" className={primaryBtn}>Log walk-thru</button>
        </form>
      </section>

      <section>
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Park-owned homes</h3>
          <span className="text-xs text-muted">{homes.length} home{homes.length === 1 ? "" : "s"}</span>
        </header>
        <PohTable items={homes} category="park_owned_home" dealId={dealId} />
      </section>

      <section>
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Buildings & structures</h3>
          <span className="text-xs text-muted">{buildings.length} building{buildings.length === 1 ? "" : "s"}</span>
        </header>
        <PohTable items={buildings} category="building_or_structure" dealId={dealId} />
      </section>
    </div>
  );
}

// ============================================================================
// Tab: Market — Comparables
// ============================================================================

function MarketTab({
  comparables,
  dealId,
}: {
  comparables: Array<{
    id: string; type: "rv_or_mh_park" | "apartment" | "single_family";
    name: string | null; city: string | null; state: string | null; phone: string | null;
    spacesOrUnits: string | null; rentLow: string | null; rentHigh: string | null;
    occupiedCount: number | null; vacantCount: number | null;
    utilitiesIncluded: string | null; moveInSpecials: string | null; salesPrice: string | null;
  }>;
  dealId: string;
}) {
  const parkComps = comparables.filter((c) => c.type === "rv_or_mh_park");
  const apartmentComps = comparables.filter((c) => c.type === "apartment");
  const sfhComps = comparables.filter((c) => c.type === "single_family");

  return (
    <div className="space-y-8">
      <section>
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">RV / MH parks</h3>
          <span className="text-xs text-muted">{parkComps.length} comp{parkComps.length === 1 ? "" : "s"}</span>
        </header>
        <ComparablesTable items={parkComps} type="rv_or_mh_park" dealId={dealId} />
      </section>
      <section>
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Apartments</h3>
          <span className="text-xs text-muted">{apartmentComps.length} comp{apartmentComps.length === 1 ? "" : "s"}</span>
        </header>
        <ComparablesTable items={apartmentComps} type="apartment" dealId={dealId} />
      </section>
      <section>
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Single-family homes</h3>
          <span className="text-xs text-muted">{sfhComps.length} comp{sfhComps.length === 1 ? "" : "s"}</span>
        </header>
        <ComparablesTable items={sfhComps} type="single_family" dealId={dealId} showPrice />
      </section>
    </div>
  );
}

// ============================================================================
// Tab: Issues — Negotiation items
// ============================================================================

function IssuesTab({
  negItems,
  dealId,
}: {
  negItems: Array<{
    id: string; problem: string; solution: string | null; estimatedCost: string | null;
    timeline: string | null; resolvedAt: Date | null; resolution: string | null;
  }>;
  dealId: string;
}) {
  return (
    <div className="space-y-4">
      {negItems.length > 0 && (
        <div className="space-y-2">
          {negItems.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-3 bg-background ${n.resolvedAt ? "border-green-200" : "border-border"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {n.resolvedAt && <Badge tone="success">Resolved</Badge>}
                    {n.problem}
                  </div>
                  {n.solution && <div className="text-xs text-muted mt-0.5">Solution: {n.solution}</div>}
                  <div className="flex gap-4 mt-1 text-xs text-muted">
                    {n.estimatedCost && <span>{money(n.estimatedCost)}</span>}
                    {n.timeline && <span>{n.timeline}</span>}
                  </div>
                  {n.resolution && <div className="text-xs mt-1.5 italic">→ {n.resolution}</div>}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {!n.resolvedAt ? (
                    <form action={resolveNegotiationItemAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={n.id} />
                      <input type="hidden" name="dealId" value={dealId} />
                      <input type="hidden" name="resolved" value="true" />
                      <input name="resolution" placeholder="How resolved?" className={`${fieldStyle} w-44`} />
                      <button type="submit" className={smallBtn}>Mark resolved</button>
                    </form>
                  ) : (
                    <form action={resolveNegotiationItemAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <input type="hidden" name="dealId" value={dealId} />
                      <input type="hidden" name="resolved" value="false" />
                      <button type="submit" className={smallBtn}>Reopen</button>
                    </form>
                  )}
                  <form action={deleteNegotiationItemAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="dealId" value={dealId} />
                    <button type="submit" className={dangerBtn}>Delete</button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <form action={addNegotiationItemAction} className="grid grid-cols-5 gap-2 items-end p-3 rounded-lg border border-dashed border-border bg-foreground/[0.015]">
        <input type="hidden" name="dealId" value={dealId} />
        <div className="col-span-2">
          <label className={labelStyle}>Problem *</label>
          <input name="problem" required className={fieldStyle} placeholder="Septic system end-of-life" />
        </div>
        <div className="col-span-2">
          <label className={labelStyle}>Proposed solution</label>
          <input name="solution" className={fieldStyle} placeholder="Seller credits $15K at close" />
        </div>
        <div className="flex gap-1 items-end">
          <input name="estimatedCost" type="number" step="0.01" className={fieldStyle} placeholder="$" />
          <button type="submit" className={primaryBtn}>Add</button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// Tab: Roster — DD Contacts
// ============================================================================

function RosterTab({
  contacts,
  dealId,
}: {
  contacts: Array<{
    id: string; category: "purchase" | "government" | "utility" | "vendor" | "market";
    role: string; contactName: string | null; phone: string | null;
    fax: string | null; email: string | null; address: string | null; notes: string | null;
  }>;
  dealId: string;
}) {
  const byCategory = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const arr = byCategory.get(c.category) ?? [];
    arr.push(c);
    byCategory.set(c.category, arr);
  }

  return (
    <div className="space-y-8">
      {(["purchase", "government", "utility", "vendor", "market"] as const).map((cat) => {
        const items = byCategory.get(cat) ?? [];
        return (
          <section key={cat}>
            <header className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm font-semibold">
                {CONTACT_CATEGORY_LABEL[cat]}
                {items.length > 0 && <span className="text-muted font-normal ml-1.5 text-xs">({items.length})</span>}
              </h3>
            </header>
            {items.length > 0 && (
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden mb-2 bg-background">
                {items.map((c) => (
                  <div key={c.id} className="px-3 py-2 grid grid-cols-12 gap-3 text-xs items-center">
                    <div className="col-span-3 font-medium">{c.role}</div>
                    <div className="col-span-2">{c.contactName ?? "—"}</div>
                    <div className="col-span-2 tabular-nums">{c.phone ?? "—"}</div>
                    <div className="col-span-3 truncate">{c.email ?? "—"}</div>
                    <div className="col-span-1 truncate text-muted">{c.notes ?? ""}</div>
                    <div className="col-span-1 text-right">
                      <form action={deleteDdContactAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="dealId" value={dealId} />
                        <button type="submit" className={dangerBtn}>×</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form action={addDdContactAction} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-dashed border-border bg-foreground/[0.015]">
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="category" value={cat} />
              <input name="role" required placeholder="Role (e.g. Title Co, Planning)" className={`${fieldStyle} col-span-3`} />
              <input name="contactName" placeholder="Contact name" className={`${fieldStyle} col-span-2`} />
              <input name="phone" placeholder="Phone" className={`${fieldStyle} col-span-2`} />
              <input name="email" type="email" placeholder="Email" className={`${fieldStyle} col-span-3`} />
              <input name="notes" placeholder="Notes" className={`${fieldStyle} col-span-1`} />
              <button type="submit" className={`${primaryBtn} col-span-1`}>Add</button>
            </form>
          </section>
        );
      })}
    </div>
  );
}

// ============================================================================
// Reusable inner pieces (unchanged from prior version)
// ============================================================================

function ChecklistRow({
  item,
  dealId,
}: {
  item: {
    id: string;
    label: string;
    doneAt: Date | null;
    dateOrdered: string | null;
    scheduledCompletion: string | null;
    notes: string | null;
    artifactUrl: string | null;
  };
  dealId: string;
}) {
  const done = !!item.doneAt;
  return (
    <details className="group">
      <summary className="flex items-center gap-3 px-3 py-2 hover:bg-foreground/[0.02] cursor-pointer list-none">
        <form action={toggleDdChecklistItemAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="done" value={done ? "false" : "true"} />
          <button
            type="submit"
            className={`size-4 rounded border flex items-center justify-center transition ${
              done ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"
            }`}
            aria-label={done ? "Mark incomplete" : "Mark complete"}
          >
            {done && (
              <svg viewBox="0 0 16 16" className="size-3" fill="none">
                <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </form>
        <span className={`text-xs flex-1 ${done ? "line-through text-muted" : ""}`}>{item.label}</span>
        <div className="flex gap-2 text-[11px] text-muted">
          {item.dateOrdered && <span>📅 {item.dateOrdered}</span>}
          {item.scheduledCompletion && <span>⏳ {item.scheduledCompletion}</span>}
          {item.artifactUrl && <span title="Has link">🔗</span>}
          {item.notes && <span title="Has notes">📝</span>}
        </div>
        <span className="text-muted text-xs transition-transform group-open:rotate-90">›</span>
      </summary>
      <form action={updateDdChecklistItemAction} className="px-3 pb-3 pt-1 grid grid-cols-4 gap-2 items-end bg-foreground/[0.015]">
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="dealId" value={dealId} />
        <div>
          <label className={labelStyle}>Date ordered</label>
          <input name="dateOrdered" type="date" defaultValue={item.dateOrdered ?? ""} className={fieldStyle} />
        </div>
        <div>
          <label className={labelStyle}>Scheduled completion</label>
          <input name="scheduledCompletion" type="date" defaultValue={item.scheduledCompletion ?? ""} className={fieldStyle} />
        </div>
        <div>
          <label className={labelStyle}>Link / artifact URL</label>
          <input name="artifactUrl" type="url" defaultValue={item.artifactUrl ?? ""} className={fieldStyle} placeholder="https://..." />
        </div>
        <div className="flex gap-2 items-end">
          <input name="notes" defaultValue={item.notes ?? ""} className={fieldStyle} placeholder="Notes…" />
          <button type="submit" className={smallBtn}>Save</button>
        </div>
      </form>
    </details>
  );
}

function NoiColumn({
  title,
  items,
  dealId,
  direction,
  accent,
}: {
  title: string;
  items: Array<{ id: string; item: string; noiImpact: string | null; timeline: string | null; implementedAt: Date | null }>;
  dealId: string;
  direction: "increase_income" | "reduce_expense";
  accent: "green" | "orange";
}) {
  const total = items.reduce((s, i) => s + Number(i.noiImpact ?? 0), 0);
  const accentClass = accent === "green" ? "text-green-700" : "text-orange-700";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h4>
        <span className={`text-xs font-semibold ${accentClass}`}>
          {total ? `+$${total.toLocaleString()}` : "—"}
        </span>
      </div>
      <div className="space-y-1.5 mb-3">
        {items.map((i) => (
          <div key={i.id} className="flex items-center gap-2 text-xs border border-border rounded-md px-2.5 py-1.5 bg-background">
            <span className="flex-1">{i.item}</span>
            {i.timeline && <span className="text-muted">{i.timeline}</span>}
            <span className={`tabular-nums font-medium ${accentClass}`}>
              {i.noiImpact ? `+$${Number(i.noiImpact).toLocaleString()}` : "—"}
            </span>
            <form action={deleteNoiItemAction}>
              <input type="hidden" name="id" value={i.id} />
              <input type="hidden" name="dealId" value={dealId} />
              <button type="submit" className={dangerBtn}>×</button>
            </form>
          </div>
        ))}
      </div>
      <form action={addNoiItemAction} className="grid grid-cols-12 gap-1.5 items-end p-3 rounded-lg border border-dashed border-border bg-foreground/[0.015]">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="direction" value={direction} />
        <input name="item" required placeholder="Item" className={`${fieldStyle} col-span-6`} />
        <input name="noiImpact" type="number" step="0.01" placeholder="$/yr" className={`${fieldStyle} col-span-2`} />
        <input name="timeline" placeholder="Q1" className={`${fieldStyle} col-span-2`} />
        <button type="submit" className={`${primaryBtn} col-span-2`}>+ Add</button>
      </form>
    </div>
  );
}

function PohTable({
  items,
  category,
  dealId,
}: {
  items: Array<{
    id: string; spaceNumberOrType: string | null; status: string | null; year: string | null;
    size: string | null; condition: string | null; marketValue: string | null;
    listOfRepairs: string | null; costOfRepairs: string | null; use: string | null;
  }>;
  category: "park_owned_home" | "building_or_structure";
  dealId: string;
}) {
  const isBuildings = category === "building_or_structure";
  return (
    <div>
      {items.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto mb-3 bg-background">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border">
                <th className="px-3 py-2 text-left font-medium">{isBuildings ? "Type" : "Space #"}</th>
                <th className="px-2 py-2 text-left font-medium">Status</th>
                <th className="px-2 py-2 text-left font-medium">Year</th>
                <th className="px-2 py-2 text-left font-medium">Size</th>
                <th className="px-2 py-2 text-left font-medium">Condition</th>
                <th className="px-2 py-2 text-right font-medium">Mkt $</th>
                <th className="px-2 py-2 text-right font-medium">Repair $</th>
                <th className="px-2 py-2 text-left font-medium">{isBuildings ? "Use" : "Repairs"}</th>
                <th className="px-3 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-medium">{p.spaceNumberOrType ?? "—"}</td>
                  <td className="px-2 py-2">{p.status ?? "—"}</td>
                  <td className="px-2 py-2">{p.year ?? "—"}</td>
                  <td className="px-2 py-2">{p.size ?? "—"}</td>
                  <td className="px-2 py-2">{p.condition ?? "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(p.marketValue)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(p.costOfRepairs)}</td>
                  <td className="px-2 py-2 truncate max-w-[200px]">{(isBuildings ? p.use : p.listOfRepairs) ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <form action={deleteParkOwnedHomeAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="dealId" value={dealId} />
                      <button type="submit" className={dangerBtn}>×</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form action={addParkOwnedHomeAction} className="grid grid-cols-9 gap-1.5 items-end p-3 rounded-lg border border-dashed border-border bg-foreground/[0.015]">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="category" value={category} />
        <input name="spaceNumberOrType" placeholder={isBuildings ? "Office" : "Space #"} className={fieldStyle} />
        <input name="status" placeholder="Status" className={fieldStyle} />
        <input name="year" placeholder="Year" className={fieldStyle} />
        <input name="size" placeholder="14x70" className={fieldStyle} />
        <input name="condition" placeholder="Good" className={fieldStyle} />
        <input name="marketValue" type="number" step="0.01" placeholder="Mkt $" className={fieldStyle} />
        <input name="costOfRepairs" type="number" step="0.01" placeholder="Repair $" className={fieldStyle} />
        <input name={isBuildings ? "use" : "listOfRepairs"} placeholder={isBuildings ? "Laundry" : "Repairs"} className={fieldStyle} />
        <button type="submit" className={primaryBtn}>+ Add</button>
      </form>
    </div>
  );
}

function ComparablesTable({
  items,
  type,
  dealId,
  showPrice,
}: {
  items: Array<{
    id: string; name: string | null; city: string | null; state: string | null; phone: string | null;
    spacesOrUnits: string | null; rentLow: string | null; rentHigh: string | null;
    occupiedCount: number | null; vacantCount: number | null;
    utilitiesIncluded: string | null; moveInSpecials: string | null; salesPrice: string | null;
  }>;
  type: "rv_or_mh_park" | "apartment" | "single_family";
  dealId: string;
  showPrice?: boolean;
}) {
  return (
    <div>
      {items.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto mb-3 bg-background">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border">
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-2 py-2 text-left font-medium">City</th>
                <th className="px-2 py-2 text-left font-medium">Phone</th>
                <th className="px-2 py-2 text-left font-medium">Units/Spaces</th>
                <th className="px-2 py-2 text-right font-medium">Rent low</th>
                <th className="px-2 py-2 text-right font-medium">Rent high</th>
                {showPrice && <th className="px-2 py-2 text-right font-medium">Sale price</th>}
                <th className="px-2 py-2 text-left font-medium">Specials</th>
                <th className="px-3 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium">{c.name ?? "—"}</td>
                  <td className="px-2 py-2">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-2 py-2 tabular-nums">{c.phone ?? "—"}</td>
                  <td className="px-2 py-2">{c.spacesOrUnits ?? "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(c.rentLow)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(c.rentHigh)}</td>
                  {showPrice && <td className="px-2 py-2 text-right tabular-nums">{money(c.salesPrice)}</td>}
                  <td className="px-2 py-2 truncate max-w-[160px]">{c.moveInSpecials ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <form action={deleteComparableAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="dealId" value={dealId} />
                      <button type="submit" className={dangerBtn}>×</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form action={addComparableAction} className="grid grid-cols-9 gap-1.5 items-end p-3 rounded-lg border border-dashed border-border bg-foreground/[0.015]">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="type" value={type} />
        <input name="name" placeholder="Name" className={fieldStyle} />
        <input name="city" placeholder="City" className={fieldStyle} />
        <input name="state" placeholder="ST" maxLength={2} className={fieldStyle} />
        <input name="phone" placeholder="Phone" className={fieldStyle} />
        <input name="spacesOrUnits" placeholder="Units" className={fieldStyle} />
        <input name="rentLow" type="number" step="0.01" placeholder="Rent low" className={fieldStyle} />
        <input name="rentHigh" type="number" step="0.01" placeholder="Rent high" className={fieldStyle} />
        {showPrice ? (
          <input name="salesPrice" type="number" step="0.01" placeholder="Price" className={fieldStyle} />
        ) : (
          <input name="moveInSpecials" placeholder="Specials" className={fieldStyle} />
        )}
        <button type="submit" className={primaryBtn}>+ Add</button>
      </form>
    </div>
  );
}

const CONTACT_CATEGORY_LABEL = {
  purchase: "Purchase (seller, title, lender, attorney)",
  government: "Government (planning, building, assessor)",
  utility: "Utilities (water, sewer, electric, gas, trash)",
  vendor: "Vendors (plumber, electrician, landscaper)",
  market: "Market (chamber, dealers, realtors)",
} as const;
