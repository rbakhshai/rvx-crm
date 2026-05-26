import Link from "next/link";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, deals } from "@/db/schema";
import { auth } from "@/lib/auth";
import { groupForStatus, type StageGroup } from "@/lib/portal-stage-groups";

function fmtRelative(iso: Date | null | undefined): string {
  if (!iso) return "—";
  const t = iso.getTime();
  const days = Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function daysSince(d: Date | null | undefined): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function priceNumber(v: string | null): number {
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type DealRow = {
  id: string;
  name: string | null;
  parkAddress: string | null;
  parkCity: string | null;
  parkState: string | null;
  statusCode: string | null;
  updateToBirdDog: string | null;
  listPrice: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const ACTIVE_GROUPS = ["new", "contact", "uw", "offer", "contract"];
const WON_GROUPS = ["won", "network"];

// The 5 high-level stages a bird dog cares about — used for per-lead progress bar
const PROGRESS_STEPS: Array<{
  key: "submitted" | "talking" | "offer" | "contract" | "closed";
  label: string;
  /** Stage groups (from portal-stage-groups) that count as "at this step" */
  matches: string[];
}> = [
  { key: "submitted", label: "Submitted", matches: ["new"] },
  { key: "talking",   label: "Talking",   matches: ["contact", "uw"] },
  { key: "offer",     label: "Offer",     matches: ["offer"] },
  { key: "contract",  label: "Contract",  matches: ["contract"] },
  { key: "closed",    label: "Closed",    matches: ["won", "network"] },
];

function progressIndexFor(statusCode: string | null): number {
  const g = groupForStatus(statusCode).code;
  return PROGRESS_STEPS.findIndex((s) => s.matches.includes(g));
}

export default async function PortalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [bd] = await db
    .select({ id: birdDogs.id, firstName: birdDogs.firstName })
    .from(birdDogs)
    .where(eq(birdDogs.userId, session.user.id))
    .limit(1);

  if (!bd) return null;

  await db
    .update(birdDogs)
    .set({ lastPortalVisitAt: new Date() })
    .where(eq(birdDogs.id, bd.id));

  const rows = await db
    .select({
      id: deals.id,
      name: deals.name,
      parkAddress: deals.parkAddress,
      parkCity: deals.parkCity,
      parkState: deals.parkState,
      statusCode: deals.statusCode,
      updateToBirdDog: deals.updateToBirdDog,
      listPrice: deals.listPrice,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
    })
    .from(deals)
    .where(eq(deals.birdDogId, bd.id))
    .orderBy(desc(deals.updatedAt));

  // ---- Aggregate stats ----
  const total = rows.length;
  const activeCount = rows.filter((r) => ACTIVE_GROUPS.includes(groupForStatus(r.statusCode).code)).length;
  const wonCount = rows.filter((r) => WON_GROUPS.includes(groupForStatus(r.statusCode).code)).length;
  const advancedCount = rows.filter((r) => {
    const g = groupForStatus(r.statusCode).code;
    return g !== "new" && g !== "unknown" && g !== "lost" && g !== "dead";
  }).length;
  const conversionPct = total > 0 ? Math.round((advancedCount / total) * 100) : 0;

  // ---- Deltas vs last 30 days ----
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const submittedLast30d = rows.filter((r) => r.createdAt > thirtyDaysAgo).length;
  const wonLast30d = rows.filter(
    (r) => WON_GROUPS.includes(groupForStatus(r.statusCode).code) && r.updatedAt > thirtyDaysAgo,
  ).length;
  const activeNewLast30d = rows.filter(
    (r) => ACTIVE_GROUPS.includes(groupForStatus(r.statusCode).code) && r.createdAt > thirtyDaysAgo,
  ).length;

  const lastSubmitted = rows
    .map((r) => r.createdAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const daysSinceLastSubmit = daysSince(lastSubmitted);

  // ---- Stage distribution bar ----
  const breakdown = new Map<string, { group: StageGroup; count: number }>();
  for (const r of rows) {
    const g = groupForStatus(r.statusCode);
    const b = breakdown.get(g.code);
    if (b) b.count++;
    else breakdown.set(g.code, { group: g, count: 1 });
  }
  const breakdownOrdered = Array.from(breakdown.values()).sort((a, b) => a.group.order - b.group.order);

  // ---- Recent team updates ----
  const recentUpdates = rows
    .filter((r) => r.updateToBirdDog && r.updateToBirdDog.trim().length > 0)
    .slice(0, 6);

  // ---- Achievements ----
  const hasMillionDollar = rows.some((r) => priceNumber(r.listPrice) >= 1_000_000);
  const achievements: { code: string; label: string; emoji: string; unlocked: boolean; description: string }[] = [
    { code: "first_lead",       label: "First lead submitted",       emoji: "🌱", unlocked: total >= 1,              description: "You're on the board." },
    { code: "five_leads",       label: "5 leads submitted",          emoji: "🦅", unlocked: total >= 5,              description: "Volume scout in the making." },
    { code: "past_review",      label: "First lead past review",     emoji: "🚀", unlocked: advancedCount >= 1,      description: "Our team moved a lead of yours forward." },
    { code: "ten_leads",        label: "10 leads submitted",         emoji: "🏆", unlocked: total >= 10,             description: "Top-quartile bird dog." },
    { code: "first_close",      label: "First closed deal",          emoji: "🎯", unlocked: wonCount >= 1,           description: "Commission incoming." },
    { code: "big_park",         label: "Submitted a $1M+ park",      emoji: "💎", unlocked: hasMillionDollar,        description: "Big league lead." },
    { code: "twenty_five",      label: "25 leads submitted",         emoji: "🌟", unlocked: total >= 25,             description: "Elite scout." },
  ];

  // ---- Grouped sections ----
  const buckets = new Map<string, { group: StageGroup; rows: DealRow[] }>();
  for (const r of rows) {
    const g = groupForStatus(r.statusCode);
    const b = buckets.get(g.code);
    if (b) b.rows.push(r);
    else buckets.set(g.code, { group: g, rows: [r] });
  }
  const ordered = Array.from(buckets.values()).sort((a, b) => a.group.order - b.group.order);

  const firstName = bd.firstName ?? "there";

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="pb-6 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hey {firstName}</h1>
          <p className="text-sm text-muted mt-1">
            Here&apos;s the state of your leads. High-volume scouts have higher conversion — keep them coming.
          </p>
        </div>
        <Link
          href="/portal/submit-lead"
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-gold-foreground hover:opacity-90 shrink-0"
        >
          + Submit a new lead
        </Link>
      </header>

      {total === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center">
          <p className="text-sm text-foreground/80">
            Once you submit a lead, you&apos;ll see it here with status updates from our team.
          </p>
          <Link
            href="/portal/submit-lead"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-gold-foreground hover:opacity-90"
          >
            Submit your first lead →
          </Link>
        </div>
      ) : (
        <>
          {/* ---- TOP STATS + NUDGE ---- */}
          <section className="mt-8 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Submitted"
                value={total.toString()}
                sub="all-time"
                delta={submittedLast30d > 0 ? `+${submittedLast30d} in last 30d` : "none in last 30d"}
                deltaPositive={submittedLast30d > 0}
              />
              <StatCard
                label="Active in pipeline"
                value={activeCount.toString()}
                sub="our team is working"
                tone="active"
                delta={activeNewLast30d > 0 ? `+${activeNewLast30d} new this month` : undefined}
                deltaPositive={true}
              />
              <StatCard
                label="Closed wins"
                value={wonCount.toString()}
                sub="commission qualifying"
                tone="won"
                delta={wonLast30d > 0 ? `+${wonLast30d} this month 🎉` : undefined}
                deltaPositive={true}
              />
              <StatCard
                label="Advancement rate"
                value={`${conversionPct}%`}
                sub={`${advancedCount} of ${total} past first review`}
              />
            </div>

            <StageBar buckets={breakdownOrdered} total={total} />

            <Nudge
              daysSinceLastSubmit={daysSinceLastSubmit}
              activeCount={activeCount}
              wonCount={wonCount}
              total={total}
            />
          </section>

          {/* ---- ACHIEVEMENTS ---- */}
          <section className="mt-10 pt-6 border-t border-border">
            <header className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm uppercase tracking-widest text-muted font-medium">Achievements</h2>
              <span className="text-[11px] text-muted">
                {achievements.filter((a) => a.unlocked).length} / {achievements.length} unlocked
              </span>
            </header>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {achievements.map((a) => (
                <li
                  key={a.code}
                  className={
                    "rounded-lg border p-3 flex items-start gap-3 transition " +
                    (a.unlocked
                      ? "border-amber-300/70 bg-gradient-to-br from-amber-50 to-amber-50/30"
                      : "border-border bg-foreground/[0.02] opacity-60")
                  }
                  title={a.unlocked ? "Unlocked" : "Locked"}
                >
                  <span className={"text-2xl shrink-0 " + (a.unlocked ? "" : "grayscale")}>{a.emoji}</span>
                  <div className="min-w-0">
                    <div className={"text-sm font-medium " + (a.unlocked ? "text-amber-900" : "text-foreground/70")}>
                      {a.label}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">{a.description}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ---- RECENT TEAM ACTIVITY ---- */}
          {recentUpdates.length > 0 && (
            <section className="mt-10 pt-6 border-t border-border">
              <header className="mb-4 flex items-baseline justify-between">
                <div>
                  <h2 className="text-sm uppercase tracking-widest text-muted font-medium">Recent team activity</h2>
                  <p className="text-[11px] text-muted mt-0.5">What our team's been saying about your leads</p>
                </div>
              </header>
              <ol className="space-y-2.5">
                {recentUpdates.map((r) => {
                  const title = r.name || r.parkAddress || "(unnamed lead)";
                  return (
                    <li key={r.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-sm font-medium truncate">{title}</div>
                        <time className="text-[11px] text-muted shrink-0 tabular-nums">{fmtRelative(r.updatedAt)}</time>
                      </div>
                      <p className="mt-1.5 text-sm text-foreground/85 whitespace-pre-wrap">{r.updateToBirdDog}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* ---- INDIVIDUAL LEADS ---- */}
          <section className="mt-10 space-y-8 pt-6 border-t border-border">
            <h2 className="text-sm uppercase tracking-widest text-muted font-medium">Your leads</h2>
            {ordered.map(({ group, rows }) => (
              <StageSection key={group.code} group={group} rows={rows} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  delta,
  deltaPositive,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "active" | "won";
  delta?: string;
  deltaPositive?: boolean;
}) {
  const accent =
    tone === "won"
      ? "text-green-700"
      : tone === "active"
      ? "text-amber-700"
      : "text-foreground";
  return (
    <div className="rounded-xl border border-border p-4 bg-background">
      <div className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{sub}</div>
      {delta && (
        <div className={"mt-1.5 text-[11px] font-medium " + (deltaPositive ? "text-green-700" : "text-muted")}>
          {delta}
        </div>
      )}
    </div>
  );
}

function StageBar({
  buckets,
  total,
}: {
  buckets: { group: StageGroup; count: number }[];
  total: number;
}) {
  if (total === 0) return null;
  const colorOf = (tone: StageGroup["tone"]) =>
    ({
      neutral: "bg-blue-400",
      active: "bg-amber-400",
      won: "bg-green-500",
      lost: "bg-red-400",
      paused: "bg-slate-400",
    } as const)[tone];

  return (
    <div className="rounded-xl border border-border p-4 bg-background">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-muted font-medium">
          Where your leads stand
        </div>
        <div className="text-[11px] text-muted">{total} total</div>
      </div>
      <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-foreground/[0.04]">
        {buckets.map((b) => (
          <div
            key={b.group.code}
            className={colorOf(b.group.tone)}
            style={{ width: `${(b.count / total) * 100}%` }}
            title={`${b.group.label}: ${b.count}`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-foreground/70">
        {buckets.map((b) => (
          <li key={b.group.code} className="flex items-center gap-1.5">
            <span className={`inline-block size-2 rounded-full ${colorOf(b.group.tone)}`} />
            <span>{b.group.label}</span>
            <span className="text-muted tabular-nums">· {b.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Nudge({
  daysSinceLastSubmit,
  activeCount,
  wonCount,
  total,
}: {
  daysSinceLastSubmit: number | null;
  activeCount: number;
  wonCount: number;
  total: number;
}) {
  let tone: "gold" | "neutral" | "warning" = "neutral";
  let title = "";
  let body = "";
  const cta: { href: string; label: string } | null = { href: "/portal/submit-lead", label: "Submit a new lead →" };

  if (wonCount > 0) {
    tone = "gold";
    title = `${wonCount} closed win${wonCount === 1 ? "" : "s"} — nice work.`;
    body = "Keep momentum. The scouts who close repeatedly submit consistently — even when others go quiet.";
  } else if (activeCount === 0 && total > 0) {
    tone = "warning";
    title = "Nothing active right now.";
    body = "All your prior leads have wrapped. Bring us your next one — even a long-shot is worth submitting.";
  } else if (daysSinceLastSubmit !== null && daysSinceLastSubmit >= 14) {
    tone = "warning";
    title = `${daysSinceLastSubmit} days since your last submission.`;
    body = "Stay sharp — even one a week keeps your conversion rate up and your name in front of our team.";
  } else if (activeCount > 0 && total === activeCount) {
    title = "All your leads are still active — well done.";
    body = "Our team will keep updates flowing here. Anything new you've spotted?";
  } else {
    title = "Keep the leads coming.";
    body = "The more parks you put in front of us, the more chances we close one together.";
  }

  const palette =
    tone === "gold"
      ? "border-amber-300 bg-amber-50/60"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50/40"
      : "border-border bg-foreground/[0.02]";

  return (
    <div className={`rounded-xl border ${palette} p-4 flex items-start justify-between gap-4`}>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-xs text-foreground/70 mt-0.5">{body}</p>
      </div>
      {cta && (
        <Link
          href={cta.href as never}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-gold px-3.5 py-1.5 text-xs font-medium text-gold-foreground hover:opacity-90"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function StageSection({ group, rows }: { group: StageGroup; rows: DealRow[] }) {
  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <StageTone tone={group.tone} />
            {group.label}
            <span className="text-muted font-normal">({rows.length})</span>
          </h2>
          <p className="text-[11px] text-muted mt-0.5">{group.description}</p>
        </div>
      </header>
      <ul className="space-y-2">
        {rows.map((r) => (
          <LeadCard key={r.id} row={r} />
        ))}
      </ul>
    </section>
  );
}

function LeadCard({ row }: { row: DealRow }) {
  const title = row.name || row.parkAddress || "(unnamed lead)";
  const loc = [row.parkCity, row.parkState].filter(Boolean).join(", ");
  const groupCode = groupForStatus(row.statusCode).code;
  const isDead = groupCode === "lost" || groupCode === "dead";
  const progressIdx = progressIndexFor(row.statusCode);

  return (
    <li className="rounded-lg border border-border p-4 bg-background hover:bg-foreground/[0.01]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{title}</div>
          {loc && <div className="text-xs text-muted truncate">{loc}</div>}
        </div>
        <div className="text-[11px] text-muted shrink-0 text-right">
          <div>Updated {fmtRelative(row.updatedAt)}</div>
          <div>Submitted {fmtRelative(row.createdAt)}</div>
        </div>
      </div>

      {/* Per-lead progress bar */}
      {!isDead && progressIdx >= 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-1">
            {PROGRESS_STEPS.map((step, i) => {
              const done = i < progressIdx;
              const current = i === progressIdx;
              return (
                <div key={step.key} className="flex-1 flex items-center gap-1">
                  <div
                    className={
                      "h-1.5 flex-1 rounded-full " +
                      (done
                        ? "bg-gold"
                        : current
                        ? "bg-gradient-to-r from-gold to-amber-300"
                        : "bg-foreground/[0.08]")
                    }
                  />
                  <div
                    className={
                      "size-2.5 rounded-full shrink-0 " +
                      (done
                        ? "bg-gold"
                        : current
                        ? "bg-gold ring-2 ring-amber-200"
                        : "bg-foreground/15")
                    }
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted">
            {PROGRESS_STEPS.map((step, i) => (
              <span
                key={step.key}
                className={i === progressIdx ? "font-semibold text-foreground" : ""}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {row.updateToBirdDog && (
        <div className="mt-3 rounded-md bg-foreground/[0.04] border border-border/50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-1">Latest update from our team</div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{row.updateToBirdDog}</p>
        </div>
      )}
    </li>
  );
}

function StageTone({ tone }: { tone: StageGroup["tone"] }) {
  const map = {
    neutral: "bg-blue-500",
    active: "bg-amber-500",
    won: "bg-green-500",
    lost: "bg-red-500",
    paused: "bg-slate-400",
  } as const;
  return <span className={`inline-block size-2 rounded-full ${map[tone]}`} />;
}
