/**
 * Closer cockpit (closer).
 *
 * One question every morning: who do I talk to next? The Do-Next stack
 * and at-risk radar answer it; the stale list and hot tier-1 buyers feed
 * outreach. All of it scoped to the deals this closer owns.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { fetchCloserDashboard, fetchHotTier1Buyers, fetchDealStatusLabels } from "@/lib/dashboard-queries";
import { getDoNextItems } from "@/lib/do-next";
import { detectAtRiskForUser } from "@/lib/at-risk";
import { DoNextStack } from "@/components/do-next-stack";
import { AtRiskWidget } from "@/components/at-risk-widget";
import { StaleBadge, PriorityBadge } from "../../dashboard/widgets";
import { fmtDateWithWeekday } from "@/lib/date-format";
import { LocalGreeting } from "@/components/local-greeting";
import { PortalHero, StatStrip, PortalStat, PortalSection, PortalCard, PortalEmpty, QueueRow, PortalCta } from "../portal-kit";
import { PortalFooter } from "./portal-common";

const ACCENT = "green" as const;

export async function CloserDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [closer, hotBuyers, doNext, atRisk, labels, newLeadsRow] = await Promise.all([
    fetchCloserDashboard(userId).catch(() => null),
    fetchHotTier1Buyers(6).catch(() => []),
    getDoNextItems(userId, 6).catch(() => []),
    detectAtRiskForUser(userId).catch(() => []),
    fetchDealStatusLabels().catch(() => new Map<string, string>()),
    db.select({ n: sql<number>`count(*)::int` }).from(contacts)
      .where(and(eq(contacts.status, "new_waiting_to_connect"), isNull(contacts.deletedAt))).catch(() => [{ n: 0 }]),
  ]);
  const newLeads = newLeadsRow[0]?.n ?? 0;

  return (
    <>
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel="Closer"
        title="Closer Cockpit"
        tagline="Your deals, your hottest buyers, your next conversation."
        icon="🤝"
        accent={ACCENT}
      >
        <PortalCta href="/triage" accent={ACCENT}>Open triage →</PortalCta>
      </PortalHero>

      <StatStrip>
        <PortalStat accent={ACCENT} emphasize value={closer?.myDealsCount ?? 0} label="My active deals" />
        <PortalStat accent={ACCENT} value={closer?.myStaleDeals.length ?? 0} label="Stale >7d" hint="need a touch" />
        <PortalStat accent={ACCENT} value={atRisk.length} label="At risk" />
        <PortalStat accent={ACCENT} value={newLeads} label="New leads" href="/contacts?status=new_waiting_to_connect" hint="waiting to connect" />
        <PortalStat accent={ACCENT} value={hotBuyers.length} label="Hot tier-1 buyers" />
        <PortalStat accent={ACCENT} value={doNext.length} label="Do-next queue" />
      </StatStrip>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <div className="space-y-4">
          <DoNextStack items={doNext} />
          <AtRiskWidget risks={atRisk} />
        </div>

        <div className="space-y-4">
          <PortalSection title="Deals going stale" accent={ACCENT} hint="Oldest touch first" className="mb-0">
            <PortalCard accent={ACCENT} lift={(closer?.myStaleDeals.length ?? 0) > 0}>
              {!closer || closer.myStaleDeals.length === 0 ? (
                <PortalEmpty>Every deal's been touched recently. 🔥</PortalEmpty>
              ) : (
                <ul className="divide-y divide-border -mx-1">
                  {closer.myStaleDeals.map((d) => (
                    <QueueRow
                      key={d.id}
                      href={`/deals/${d.id}`}
                      primary={<span className="flex items-center gap-1.5"><PriorityBadge priority={d.dealPriority} /><span className="truncate">{d.name || d.parkAddress || "(unnamed deal)"}</span></span>}
                      secondary={d.parkState ?? undefined}
                      trailing={<StaleBadge since={d.closerLastTouch} />}
                    />
                  ))}
                </ul>
              )}
            </PortalCard>
          </PortalSection>

          <PortalSection title="Hot tier-1 buyers" accent={ACCENT} hint="Active 🔥, top of the book"
            action={<a href="/contacts?status=active_looking_hot&tier=tier_1_experienced_rvp_network" className="text-[11px] text-muted hover:text-foreground">All →</a>} className="mb-0">
            <PortalCard>
              {hotBuyers.length === 0 ? (
                <PortalEmpty>No hot tier-1 buyers right now.</PortalEmpty>
              ) : (
                <ul className="divide-y divide-border -mx-1">
                  {hotBuyers.map((b) => (
                    <QueueRow
                      key={b.id}
                      href={`/contacts/${b.id}`}
                      primary={[b.firstName, b.lastName].filter(Boolean).join(" ") || b.email || "(unnamed)"}
                      secondary={b.pofAmount ? `POF ${Number(b.pofAmount).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}` : undefined}
                    />
                  ))}
                </ul>
              )}
            </PortalCard>
          </PortalSection>
        </div>
      </div>

      <PortalFooter userId={userId} />
    </>
  );
}
