import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc, desc } from "drizzle-orm";
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
} from "@/db/schema";
import { PageShell } from "../../../page-shell";
import { LinkButton } from "@/components/button";
import { Badge } from "@/components/badge";
import { DD_SECTION_LABELS } from "@/lib/dd-checklist-template";
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
// Layout primitives
// ============================================================================

function DdCard({
  title,
  count,
  children,
  defaultOpen,
  subtitle,
}: {
  title: string;
  count?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  subtitle?: string;
}) {
  return (
    <details
      className="group rounded-xl border border-border bg-background overflow-hidden"
      open={defaultOpen}
    >
      <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer hover:bg-foreground/[0.02] list-none">
        <div className="flex items-baseline gap-3 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          {count && <span className="text-xs text-muted whitespace-nowrap">{count}</span>}
          {subtitle && <span className="text-xs text-muted truncate">— {subtitle}</span>}
        </div>
        <span className="text-muted text-sm transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="px-5 pb-5 pt-1 border-t border-border">{children}</div>
    </details>
  );
}

const fieldStyle =
  "w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const labelStyle = "text-[10px] uppercase tracking-widest text-muted font-medium block mb-0.5";

const smallBtn =
  "rounded-md border border-border bg-foreground/[0.04] px-2.5 py-1 text-xs font-medium hover:bg-foreground/[0.08] transition";

const primaryBtn =
  "rounded-md bg-primary text-primary-foreground px-3 py-1 text-xs font-medium hover:opacity-90 transition";

const dangerBtn =
  "text-red-600 hover:text-red-700 text-xs font-medium underline-offset-2 hover:underline";

function money(v: string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString()}`;
}

// ============================================================================
// Main page
// ============================================================================

export default async function DueDiligencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) notFound();

  // Seed checklist on first visit (no-op if already exists)
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
  ] = await Promise.all([
    db.select().from(ddChecklistItems).where(eq(ddChecklistItems.dealId, id))
      .orderBy(asc(ddChecklistItems.sortOrder)),
    db.select().from(ddCapxItems).where(eq(ddCapxItems.dealId, id))
      .orderBy(asc(ddCapxItems.createdAt)),
    db.select().from(ddWalkThroughs).where(eq(ddWalkThroughs.dealId, id))
      .orderBy(desc(ddWalkThroughs.inspectedAt)),
    db.select().from(ddNegotiationItems).where(eq(ddNegotiationItems.dealId, id))
      .orderBy(asc(ddNegotiationItems.createdAt)),
    db.select().from(ddNoiItems).where(eq(ddNoiItems.dealId, id))
      .orderBy(asc(ddNoiItems.direction), asc(ddNoiItems.createdAt)),
    db.select().from(ddParkOwnedHomes).where(eq(ddParkOwnedHomes.dealId, id))
      .orderBy(asc(ddParkOwnedHomes.category), asc(ddParkOwnedHomes.spaceNumberOrType)),
    db.select().from(ddRentRollEntries).where(eq(ddRentRollEntries.dealId, id))
      .orderBy(desc(ddRentRollEntries.asOfDate), asc(ddRentRollEntries.spaceNumber)),
    db.select().from(ddComparables).where(eq(ddComparables.dealId, id))
      .orderBy(asc(ddComparables.type), asc(ddComparables.createdAt)),
    db.select().from(ddContacts).where(eq(ddContacts.dealId, id))
      .orderBy(asc(ddContacts.category), asc(ddContacts.role)),
  ]);

  // Group checklist by section
  const checklistBySection = new Map<string, typeof checklist>();
  for (const item of checklist) {
    const arr = checklistBySection.get(item.section) ?? [];
    arr.push(item);
    checklistBySection.set(item.section, arr);
  }

  const totalItems = checklist.length;
  const doneItems = checklist.filter((i) => i.doneAt).length;
  const pctDone = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  // Group NOI items by direction
  const noiIncome = noiItems.filter((i) => i.direction === "increase_income");
  const noiExpense = noiItems.filter((i) => i.direction === "reduce_expense");
  const totalNoiImpact = noiItems.reduce((sum, i) => sum + Number(i.noiImpact ?? 0), 0);

  // CapX total
  const totalCapx = capx.reduce((sum, i) => sum + Number(i.expectedCost ?? 0), 0);

  // Contacts grouped
  const contactsByCategory = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const arr = contactsByCategory.get(c.category) ?? [];
    arr.push(c);
    contactsByCategory.set(c.category, arr);
  }

  // POH grouped
  const homes = pohItems.filter((i) => i.category === "park_owned_home");
  const buildings = pohItems.filter((i) => i.category === "building_or_structure");

  // Comparables grouped
  const parkComps = comparables.filter((c) => c.type === "rv_or_mh_park");
  const apartmentComps = comparables.filter((c) => c.type === "apartment");
  const sfhComps = comparables.filter((c) => c.type === "single_family");

  // Rent roll latest snapshot
  const latestRentRollDate = rentRoll[0]?.asOfDate ?? null;
  const latestRentRoll = latestRentRollDate
    ? rentRoll.filter((r) => r.asOfDate === latestRentRollDate)
    : [];

  const title = deal.name || deal.parkAddress || "(unnamed deal)";

  return (
    <PageShell
      title="Due Diligence"
      subtitle={title}
      action={
        <div className="flex gap-2 items-center">
          <Link
            href={`/deals/${id}` as never}
            className="text-sm text-muted hover:text-foreground self-center"
          >
            ← Back to deal
          </Link>
          <LinkButton href={`/deals/${id}/edit`} variant="secondary" size="sm">
            Edit deal
          </LinkButton>
        </div>
      }
    >
      {/* ====== Progress hero ====== */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-foreground/[0.03] to-foreground/[0.01] p-6 mb-8">
        <div className="grid sm:grid-cols-4 gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted font-medium">Checklist</div>
            <div className="mt-1 text-3xl font-semibold">
              {doneItems}<span className="text-muted text-lg">/{totalItems}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${pctDone}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-muted">{pctDone}% complete</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted font-medium">CapX budget</div>
            <div className="mt-1 text-3xl font-semibold">
              {totalCapx ? `$${(totalCapx / 1000).toFixed(0)}K` : "—"}
            </div>
            <div className="mt-1 text-xs text-muted">{capx.length} item{capx.length === 1 ? "" : "s"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted font-medium">NOI impact</div>
            <div className="mt-1 text-3xl font-semibold text-green-700">
              {totalNoiImpact ? `+$${(totalNoiImpact / 1000).toFixed(0)}K` : "—"}
            </div>
            <div className="mt-1 text-xs text-muted">
              {noiIncome.length} income · {noiExpense.length} expense
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted font-medium">Negotiation</div>
            <div className="mt-1 text-3xl font-semibold">
              {negItems.filter((i) => !i.resolvedAt).length}
              <span className="text-muted text-lg">/{negItems.length}</span>
            </div>
            <div className="mt-1 text-xs text-muted">open / total</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* ====== Checklist ====== */}
        <DdCard
          title="Checklist"
          count={`${doneItems}/${totalItems} done`}
          defaultOpen
        >
          <div className="space-y-6">
            {(Object.keys(DD_SECTION_LABELS) as Array<keyof typeof DD_SECTION_LABELS>).map((section) => {
              const items = checklistBySection.get(section) ?? [];
              if (items.length === 0) return null;
              const sectionDone = items.filter((i) => i.doneAt).length;
              return (
                <div key={section}>
                  <div className="flex items-baseline justify-between mb-2">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      {DD_SECTION_LABELS[section]}
                    </h4>
                    <span className="text-[11px] text-muted">{sectionDone}/{items.length}</span>
                  </div>
                  <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                    {items.map((item) => (
                      <ChecklistRow key={item.id} item={item} dealId={id} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DdCard>

        {/* ====== Capital Expenditures ====== */}
        <DdCard
          title="Capital Expenditures"
          count={`${capx.length} item${capx.length === 1 ? "" : "s"} · ${totalCapx ? `$${totalCapx.toLocaleString()}` : "$0"}`}
        >
          {capx.length > 0 && (
            <div className="overflow-x-auto -mx-5 mb-4">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border">
                    <th className="px-5 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Expected $</th>
                    <th className="px-3 py-2 text-left font-medium">Timeline</th>
                    <th className="px-5 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {capx.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-2"><Badge>{c.type.replace(/_/g, " ")}</Badge></td>
                      <td className="px-3 py-2">{c.description ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(c.expectedCost)}</td>
                      <td className="px-3 py-2">{c.timeline ?? "—"}</td>
                      <td className="px-5 py-2 text-right">
                        <form action={deleteCapxItemAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="dealId" value={id} />
                          <button type="submit" className={dangerBtn}>Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <form action={addCapxItemAction} className="grid grid-cols-6 gap-2 items-end">
            <input type="hidden" name="dealId" value={id} />
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
        </DdCard>

        {/* ====== Walk-Throughs ====== */}
        <DdCard
          title="Walk-Throughs"
          count={`${walks.length} log${walks.length === 1 ? "" : "s"}`}
        >
          {walks.length > 0 && (
            <div className="space-y-3 mb-4">
              {walks.map((w) => (
                <div key={w.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{w.inspectedAt}</span>
                    <form action={deleteWalkThroughAction}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="dealId" value={id} />
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
          <form action={addWalkThroughAction} className="grid grid-cols-4 gap-2 items-end">
            <input type="hidden" name="dealId" value={id} />
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
        </DdCard>

        {/* ====== Negotiation Items ====== */}
        <DdCard
          title="Negotiation Items"
          count={`${negItems.filter((i) => !i.resolvedAt).length} open · ${negItems.length} total`}
        >
          {negItems.length > 0 && (
            <div className="space-y-3 mb-4">
              {negItems.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 ${n.resolvedAt ? "border-green-200 bg-green-50/30" : "border-border"}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
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
                      {n.resolution && (
                        <div className="text-xs mt-1.5 italic">→ {n.resolution}</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {!n.resolvedAt ? (
                        <form action={resolveNegotiationItemAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="id" value={n.id} />
                          <input type="hidden" name="dealId" value={id} />
                          <input type="hidden" name="resolved" value="true" />
                          <input name="resolution" placeholder="How resolved?" className={`${fieldStyle} w-44`} />
                          <button type="submit" className={smallBtn}>Mark resolved</button>
                        </form>
                      ) : (
                        <form action={resolveNegotiationItemAction}>
                          <input type="hidden" name="id" value={n.id} />
                          <input type="hidden" name="dealId" value={id} />
                          <input type="hidden" name="resolved" value="false" />
                          <button type="submit" className={smallBtn}>Reopen</button>
                        </form>
                      )}
                      <form action={deleteNegotiationItemAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="dealId" value={id} />
                        <button type="submit" className={dangerBtn}>Delete</button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form action={addNegotiationItemAction} className="grid grid-cols-5 gap-2 items-end">
            <input type="hidden" name="dealId" value={id} />
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
        </DdCard>

        {/* ====== NOI Maximization ====== */}
        <DdCard
          title="NOI Maximization Plan"
          count={`+$${totalNoiImpact.toLocaleString()} annual impact`}
        >
          <div className="grid md:grid-cols-2 gap-6">
            <NoiColumn
              title="Increase income"
              items={noiIncome}
              dealId={id}
              direction="increase_income"
              accent="green"
            />
            <NoiColumn
              title="Reduce expenses"
              items={noiExpense}
              dealId={id}
              direction="reduce_expense"
              accent="orange"
            />
          </div>
        </DdCard>

        {/* ====== Park-Owned Homes & Buildings ====== */}
        <DdCard
          title="Park-Owned Homes & Buildings"
          count={`${homes.length} home${homes.length === 1 ? "" : "s"} · ${buildings.length} building${buildings.length === 1 ? "" : "s"}`}
        >
          <PohTable
            title="Park-owned homes"
            items={homes}
            category="park_owned_home"
            dealId={id}
          />
          <div className="mt-6">
            <PohTable
              title="Buildings & structures"
              items={buildings}
              category="building_or_structure"
              dealId={id}
            />
          </div>
        </DdCard>

        {/* ====== Rent Roll ====== */}
        <DdCard
          title="Rent Roll"
          count={
            latestRentRollDate
              ? `${latestRentRoll.length} space${latestRentRoll.length === 1 ? "" : "s"} as of ${latestRentRollDate}`
              : "no entries"
          }
        >
          {latestRentRoll.length > 0 && (
            <div className="overflow-x-auto -mx-5 mb-4">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border">
                    <th className="px-5 py-2 text-left font-medium">Space</th>
                    <th className="px-2 py-2 text-left font-medium">Resident</th>
                    <th className="px-2 py-2 text-right font-medium">Lot rent</th>
                    <th className="px-2 py-2 text-right font-medium">Home rent</th>
                    <th className="px-2 py-2 text-right font-medium">Other</th>
                    <th className="px-2 py-2 text-right font-medium">Delinquent</th>
                    <th className="px-2 py-2 text-left font-medium">Move-in</th>
                    <th className="px-5 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {latestRentRoll.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-2 font-medium">{r.spaceNumber ?? "—"}</td>
                      <td className="px-2 py-2">{r.residentName ?? "—"}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{money(r.lotRent)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{money(r.rentalHomeRent)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{money(r.otherCharges)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {r.delinquentBalance && Number(r.delinquentBalance) > 0 ? (
                          <span className="text-red-700">{money(r.delinquentBalance)}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2 text-muted">{r.moveInDate ?? "—"}</td>
                      <td className="px-5 py-2 text-right">
                        <form action={deleteRentRollEntryAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="dealId" value={id} />
                          <button type="submit" className={dangerBtn}>×</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <form action={addRentRollEntryAction} className="grid grid-cols-8 gap-2 items-end">
            <input type="hidden" name="dealId" value={id} />
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
        </DdCard>

        {/* ====== Comparables ====== */}
        <DdCard
          title="Market Comparables"
          count={`${parkComps.length} parks · ${apartmentComps.length} apts · ${sfhComps.length} SFH`}
        >
          <ComparablesTable title="RV / MH parks" items={parkComps} type="rv_or_mh_park" dealId={id} />
          <div className="mt-6">
            <ComparablesTable title="Apartments" items={apartmentComps} type="apartment" dealId={id} />
          </div>
          <div className="mt-6">
            <ComparablesTable title="Single-family homes" items={sfhComps} type="single_family" dealId={id} showPrice />
          </div>
        </DdCard>

        {/* ====== DD Contacts ====== */}
        <DdCard
          title="DD Contacts"
          count={`${contacts.length} contact${contacts.length === 1 ? "" : "s"}`}
        >
          {(["purchase", "government", "utility", "vendor", "market"] as const).map((cat) => {
            const items = contactsByCategory.get(cat) ?? [];
            return (
              <div key={cat} className="mb-6 last:mb-0">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground mb-2">
                  {CONTACT_CATEGORY_LABEL[cat]}{items.length > 0 && <span className="text-muted font-normal ml-1.5">({items.length})</span>}
                </h4>
                {items.length > 0 && (
                  <div className="divide-y divide-border border border-border rounded-lg overflow-hidden mb-2">
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
                            <input type="hidden" name="dealId" value={id} />
                            <button type="submit" className={dangerBtn}>×</button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <form action={addDdContactAction} className="grid grid-cols-12 gap-2 items-end">
                  <input type="hidden" name="dealId" value={id} />
                  <input type="hidden" name="category" value={cat} />
                  <input name="role" required placeholder="Role (e.g. Title Co, Planning)" className={`${fieldStyle} col-span-3`} />
                  <input name="contactName" placeholder="Contact name" className={`${fieldStyle} col-span-2`} />
                  <input name="phone" placeholder="Phone" className={`${fieldStyle} col-span-2`} />
                  <input name="email" type="email" placeholder="Email" className={`${fieldStyle} col-span-3`} />
                  <input name="notes" placeholder="Notes" className={`${fieldStyle} col-span-1`} />
                  <button type="submit" className={`${primaryBtn} col-span-1`}>Add</button>
                </form>
              </div>
            );
          })}
        </DdCard>
      </div>
    </PageShell>
  );
}

// ============================================================================
// Component pieces
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
              done
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border hover:border-primary"
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
        <span className={`text-xs flex-1 ${done ? "line-through text-muted" : ""}`}>
          {item.label}
        </span>
        <div className="flex gap-2 text-[11px] text-muted">
          {item.dateOrdered && <span>📅 {item.dateOrdered}</span>}
          {item.scheduledCompletion && <span>⏳ {item.scheduledCompletion}</span>}
          {item.artifactUrl && <span title="Has link">🔗</span>}
          {item.notes && <span title="Has notes">📝</span>}
        </div>
        <span className="text-muted text-xs transition-transform group-open:rotate-90">›</span>
      </summary>
      <form
        action={updateDdChecklistItemAction}
        className="px-3 pb-3 pt-1 grid grid-cols-4 gap-2 items-end bg-foreground/[0.015]"
      >
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
  items: Array<{
    id: string;
    item: string;
    noiImpact: string | null;
    timeline: string | null;
    implementedAt: Date | null;
  }>;
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
          <div key={i.id} className="flex items-center gap-2 text-xs border border-border rounded-md px-2.5 py-1.5">
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
      <form action={addNoiItemAction} className="grid grid-cols-12 gap-1.5 items-end">
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
  title,
  items,
  category,
  dealId,
}: {
  title: string;
  items: Array<{
    id: string;
    spaceNumberOrType: string | null;
    status: string | null;
    year: string | null;
    size: string | null;
    condition: string | null;
    marketValue: string | null;
    listOfRepairs: string | null;
    costOfRepairs: string | null;
    use: string | null;
  }>;
  category: "park_owned_home" | "building_or_structure";
  dealId: string;
}) {
  const isBuildings = category === "building_or_structure";
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground mb-2">{title}</h4>
      {items.length > 0 && (
        <div className="overflow-x-auto -mx-5 mb-3">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border">
                <th className="px-5 py-2 text-left font-medium">{isBuildings ? "Type" : "Space #"}</th>
                <th className="px-2 py-2 text-left font-medium">Status</th>
                <th className="px-2 py-2 text-left font-medium">Year</th>
                <th className="px-2 py-2 text-left font-medium">Size</th>
                <th className="px-2 py-2 text-left font-medium">Condition</th>
                <th className="px-2 py-2 text-right font-medium">Mkt $</th>
                <th className="px-2 py-2 text-right font-medium">Repair $</th>
                <th className="px-2 py-2 text-left font-medium">{isBuildings ? "Use" : "Repairs"}</th>
                <th className="px-5 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-2 font-medium">{p.spaceNumberOrType ?? "—"}</td>
                  <td className="px-2 py-2">{p.status ?? "—"}</td>
                  <td className="px-2 py-2">{p.year ?? "—"}</td>
                  <td className="px-2 py-2">{p.size ?? "—"}</td>
                  <td className="px-2 py-2">{p.condition ?? "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(p.marketValue)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(p.costOfRepairs)}</td>
                  <td className="px-2 py-2 truncate max-w-[200px]">{(isBuildings ? p.use : p.listOfRepairs) ?? "—"}</td>
                  <td className="px-5 py-2 text-right">
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
      <form action={addParkOwnedHomeAction} className="grid grid-cols-9 gap-1.5 items-end">
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
  title,
  items,
  type,
  dealId,
  showPrice,
}: {
  title: string;
  items: Array<{
    id: string;
    name: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    spacesOrUnits: string | null;
    rentLow: string | null;
    rentHigh: string | null;
    occupiedCount: number | null;
    vacantCount: number | null;
    utilitiesIncluded: string | null;
    moveInSpecials: string | null;
    salesPrice: string | null;
  }>;
  type: "rv_or_mh_park" | "apartment" | "single_family";
  dealId: string;
  showPrice?: boolean;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground mb-2">{title}</h4>
      {items.length > 0 && (
        <div className="overflow-x-auto -mx-5 mb-3">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border">
                <th className="px-5 py-2 text-left font-medium">Name</th>
                <th className="px-2 py-2 text-left font-medium">City</th>
                <th className="px-2 py-2 text-left font-medium">Phone</th>
                <th className="px-2 py-2 text-left font-medium">Units/Spaces</th>
                <th className="px-2 py-2 text-right font-medium">Rent low</th>
                <th className="px-2 py-2 text-right font-medium">Rent high</th>
                {showPrice && <th className="px-2 py-2 text-right font-medium">Sale price</th>}
                <th className="px-2 py-2 text-left font-medium">Specials</th>
                <th className="px-5 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-2 font-medium">{c.name ?? "—"}</td>
                  <td className="px-2 py-2">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-2 py-2 tabular-nums">{c.phone ?? "—"}</td>
                  <td className="px-2 py-2">{c.spacesOrUnits ?? "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(c.rentLow)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(c.rentHigh)}</td>
                  {showPrice && <td className="px-2 py-2 text-right tabular-nums">{money(c.salesPrice)}</td>}
                  <td className="px-2 py-2 truncate max-w-[160px]">{c.moveInSpecials ?? "—"}</td>
                  <td className="px-5 py-2 text-right">
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
      <form action={addComparableAction} className="grid grid-cols-9 gap-1.5 items-end">
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
