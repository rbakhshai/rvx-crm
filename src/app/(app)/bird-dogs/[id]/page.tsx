import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { eq, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, birdDogStatuses, deals, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PageShell } from "../../page-shell";
import { LinkButton } from "@/components/button";
import { DeleteButton } from "@/components/delete-button";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/task-list";
import { deleteBirdDogAction } from "../actions";
import { Badge } from "@/components/badge";
import { Section } from "@/components/section";
import {
  BD_ACQUISITION_LEVEL_OPTIONS,
  TRAINING_STATUS_OPTIONS,
} from "@/lib/options";
import { groupForStatus, type StageGroup } from "@/lib/portal-stage-groups";

const levelLabel = new Map(BD_ACQUISITION_LEVEL_OPTIONS.map((o) => [o.value, o.label]));
const trainingLabel = new Map(TRAINING_STATUS_OPTIONS.map((o) => [o.value, o.label]));

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted font-medium">{label}</dt>
      <dd className="mt-1 text-sm">
        {value === null || value === undefined || value === "" ? <span className="text-muted">—</span> : value}
      </dd>
    </div>
  );
}

function bool(v: boolean | null | undefined) {
  if (v == null) return undefined;
  return v ? <Badge tone="success">Yes</Badge> : <Badge tone="muted">No</Badge>;
}

function ScoreStat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "active" | "won";
}) {
  const accent =
    tone === "won" ? "text-green-700" : tone === "active" ? "text-amber-700" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${accent}`}>{value}</div>
      <div className="text-[10px] text-muted mt-0.5">{sub}</div>
    </div>
  );
}

const ACTIVE_GROUPS = ["new", "contact", "uw", "offer", "contract"];
const WON_GROUPS = ["won", "network"];

function priceNumber(v: string | null): number {
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoneyShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtRelative(d: Date | null | undefined): string {
  if (!d) return "—";
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default async function BirdDogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bd] = await db.select().from(birdDogs).where(eq(birdDogs.id, id)).limit(1);
  if (!bd) notFound();

  const statuses = await db.select().from(birdDogStatuses).orderBy(asc(birdDogStatuses.sortOrder));
  const statusLabel = new Map(statuses.map((s) => [s.code, s.label]));

  // Pull this BD's leads for the scorecard
  const bdLeads = await db
    .select({
      id: deals.id,
      name: deals.name,
      parkAddress: deals.parkAddress,
      parkCity: deals.parkCity,
      parkState: deals.parkState,
      statusCode: deals.statusCode,
      listPrice: deals.listPrice,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
    })
    .from(deals)
    .where(eq(deals.birdDogId, bd.id))
    .orderBy(desc(deals.updatedAt));

  // Aggregate stats
  const total = bdLeads.length;
  const activeCount = bdLeads.filter((r) => ACTIVE_GROUPS.includes(groupForStatus(r.statusCode).code)).length;
  const wonCount = bdLeads.filter((r) => WON_GROUPS.includes(groupForStatus(r.statusCode).code)).length;
  const advancedCount = bdLeads.filter((r) => {
    const g = groupForStatus(r.statusCode).code;
    return g !== "new" && g !== "unknown" && g !== "lost" && g !== "dead";
  }).length;
  const conversionPct = total > 0 ? Math.round((advancedCount / total) * 100) : 0;
  const pipelineValue = bdLeads
    .filter((r) => ACTIVE_GROUPS.includes(groupForStatus(r.statusCode).code))
    .reduce((sum, r) => sum + priceNumber(r.listPrice), 0);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const submittedLast30d = bdLeads.filter((r) => r.createdAt > thirtyDaysAgo).length;

  // Stage distribution
  const distribution = new Map<string, { group: StageGroup; count: number }>();
  for (const r of bdLeads) {
    const g = groupForStatus(r.statusCode);
    const b = distribution.get(g.code);
    if (b) b.count++;
    else distribution.set(g.code, { group: g, count: 1 });
  }
  const distributionOrdered = Array.from(distribution.values()).sort((a, b) => a.group.order - b.group.order);

  const lastSubmittedAt = bdLeads.length > 0 ? bdLeads.map((r) => r.createdAt).sort((a, b) => b.getTime() - a.getTime())[0] : null;

  const session = await auth.api.getSession({ headers: await headers() });
  const [owner] = bd.ownerId
    ? await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, bd.ownerId)).limit(1)
    : [null];
  const deleteBound = deleteBirdDogAction.bind(null, id);

  const name = [bd.firstName, bd.lastName].filter(Boolean).join(" ") || "(unnamed)";

  return (
    <PageShell
      title={name}
      subtitle={bd.email ?? "no email"}
      action={
        <div className="flex gap-2 items-center">
          <Link href="/bird-dogs" className="text-sm text-muted hover:text-foreground self-center">
            ← Back
          </Link>
          <LinkButton href={`/bird-dogs/${bd.id}/edit`} variant="secondary" size="sm">
            Edit
          </LinkButton>
          <DeleteButton
            action={deleteBound}
            confirmText={`Delete bird dog "${name}"? This cannot be undone.`}
          />
        </div>
      }
    >
      <Section title="Scorecard">
        {/* Portal account status */}
        <div className="mb-5 rounded-md border border-border bg-foreground/[0.02] px-3 py-2 text-sm flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-muted font-medium mr-2">Portal access</span>
            {bd.userId ? (
              <span className="text-foreground">
                ✓ Linked · last visit {fmtRelative(bd.lastPortalVisitAt)}
              </span>
            ) : (
              <span className="text-muted">
                Not linked — they need to sign up at <code className="text-xs">/login</code> using
                {bd.email ? <> <code className="text-xs">{bd.email}</code></> : " their email"}
              </span>
            )}
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <ScoreStat label="Submitted" value={total.toString()} sub={`+${submittedLast30d} last 30d`} />
          <ScoreStat label="Active" value={activeCount.toString()} sub="in pipeline" tone="active" />
          <ScoreStat label="Wins" value={wonCount.toString()} sub="closed deals" tone="won" />
          <ScoreStat label="Advancement" value={`${conversionPct}%`} sub={`${advancedCount}/${total} past review`} />
          <ScoreStat label="Pipeline $" value={fmtMoneyShort(pipelineValue)} sub="active list-price sum" />
        </div>

        {/* Stage distribution bar */}
        {total > 0 && (
          <div className="mt-4 rounded-md border border-border bg-background p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-widest text-muted font-medium">
                Where their leads stand
              </div>
              <div className="text-[11px] text-muted">last submission {fmtRelative(lastSubmittedAt)}</div>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden flex bg-foreground/[0.04]">
              {distributionOrdered.map((b) => (
                <div
                  key={b.group.code}
                  className={
                    b.group.tone === "won" ? "bg-green-500" :
                    b.group.tone === "active" ? "bg-amber-400" :
                    b.group.tone === "lost" ? "bg-red-400" :
                    b.group.tone === "paused" ? "bg-slate-400" :
                    "bg-blue-400"
                  }
                  style={{ width: `${(b.count / total) * 100}%` }}
                  title={`${b.group.label}: ${b.count}`}
                />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-foreground/70">
              {distributionOrdered.map((b) => (
                <li key={b.group.code} className="flex items-center gap-1.5">
                  <span
                    className={`inline-block size-1.5 rounded-full ${
                      b.group.tone === "won" ? "bg-green-500" :
                      b.group.tone === "active" ? "bg-amber-400" :
                      b.group.tone === "lost" ? "bg-red-400" :
                      b.group.tone === "paused" ? "bg-slate-400" :
                      "bg-blue-400"
                    }`}
                  />
                  <span>{b.group.label}</span>
                  <span className="text-muted tabular-nums">· {b.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lead list */}
        {bdLeads.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-widest text-muted font-medium">Their leads ({bdLeads.length})</h3>
              <Link href={`/deals?bird_dog=${bd.id}` as never} className="text-[11px] text-muted hover:text-foreground">
                View all in deals →
              </Link>
            </div>
            <ul className="rounded-md border border-border divide-y divide-border bg-background">
              {bdLeads.slice(0, 10).map((d) => {
                const g = groupForStatus(d.statusCode);
                const dealTitle = d.name || d.parkAddress || "(unnamed)";
                const loc = [d.parkCity, d.parkState].filter(Boolean).join(", ");
                const price = priceNumber(d.listPrice);
                return (
                  <li key={d.id}>
                    <Link
                      href={`/deals/${d.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-foreground/[0.02]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{dealTitle}</div>
                        <div className="text-[11px] text-muted truncate">
                          {loc && <>{loc} · </>}
                          submitted {fmtRelative(d.createdAt)}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-3 text-[11px]">
                        {price > 0 && (
                          <span className="tabular-nums text-foreground/80">{fmtMoneyShort(price)}</span>
                        )}
                        <span
                          className={
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border " +
                            (g.tone === "won" ? "border-green-300 text-green-800 bg-green-50" :
                             g.tone === "active" ? "border-amber-300 text-amber-800 bg-amber-50" :
                             g.tone === "lost" ? "border-red-300 text-red-800 bg-red-50" :
                             g.tone === "paused" ? "border-slate-300 text-slate-700 bg-slate-50" :
                             "border-blue-300 text-blue-800 bg-blue-50")
                          }
                        >
                          {g.label}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {bdLeads.length > 10 && (
              <div className="text-[11px] text-muted mt-1.5 text-right">
                Showing 10 of {bdLeads.length}. Use the &quot;View all&quot; link for full list.
              </div>
            )}
          </div>
        )}

        {bdLeads.length === 0 && (
          <div className="mt-5 rounded-md border border-dashed border-border bg-foreground/[0.02] p-6 text-center text-sm text-muted">
            No leads submitted yet.
          </div>
        )}
      </Section>

      <Section title="Identity">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="First name" value={bd.firstName} />
          <Field label="Last name" value={bd.lastName} />
          <Field label="Email" value={bd.email} />
          <Field label="Cell phone" value={bd.cellPhone} />
          <Field label="Facebook URL" value={bd.facebookUrl} />
        </dl>
      </Section>

      <Section title="Status & level">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Status" value={bd.statusCode ? statusLabel.get(bd.statusCode) ?? bd.statusCode : null} />
          <Field label="Acquisition level" value={bd.acquisitionLevel ? levelLabel.get(bd.acquisitionLevel) : null} />
          <Field label="Start date" value={bd.startDate} />
          <Field label="Agreement signed" value={bd.agreementSignDate} />
          <Field label="RVX agreement signed?" value={bool(bd.rvxAgreementSigned)} />
          <Field label="Owner" value={owner ? `${owner.name} (${owner.email})` : null} />
        </dl>
      </Section>

      <Section title="Training">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Completed training" value={bool(bd.completedTraining)} />
          <Field label="Ethics training" value={bd.ethicsTrainingStatus ? trainingLabel.get(bd.ethicsTrainingStatus) : null} />
        </dl>
      </Section>

      <Section title="Discord & access">
        <dl className="grid sm:grid-cols-3 gap-4">
          <Field label="In Discord" value={bool(bd.isInDiscord)} />
          <Field label="Kicked from Discord" value={bool(bd.kickedFromDiscord)} />
          <Field label="Tracker access" value={bool(bd.giveAccessToTracker)} />
        </dl>
      </Section>

      <Section title="Community">
        <dl className="grid sm:grid-cols-3 gap-4">
          <Field label="Subto" value={bd.subtoMember ? <Badge tone="success">{bd.subtoSince ?? "yes"}</Badge> : null} />
          <Field label="Gator" value={bd.gatorMember ? <Badge tone="success">{bd.gatorSince ?? "yes"}</Badge> : null} />
          <Field label="Top Tier" value={bd.topTierMember ? <Badge tone="success">{bd.topTierSince ?? "yes"}</Badge> : null} />
          <Field label="Owners Club" value={bd.ownersClubMember ? <Badge tone="success">{bd.ownersClubSince ?? "yes"}</Badge> : null} />
          <Field label="Zero Down" value={bd.zeroDownMember ? <Badge tone="success">{bd.zeroDownSince ?? "yes"}</Badge> : null} />
        </dl>
      </Section>

      <Section title="RV lifestyle">
        <dl className="grid sm:grid-cols-3 gap-4">
          <Field label="RV class" value={bd.rvClass} />
          <Field label="Rig" value={bd.rvRig} />
          <Field label="Years full-time" value={bd.yearsFullTimeTraveling} />
        </dl>
      </Section>

      <TaskList parentTable="bird_dogs" parentId={bd.id} currentUserId={session?.user.id} />
      <ActivityTimeline parentTable="bird_dogs" parentId={bd.id} currentUserId={session?.user.id} />

      {(bd.whyJoinRvx || bd.howHeardAboutRvx || bd.gamePlanForward) && (
        <Section title="Background notes">
          {bd.whyJoinRvx && <p className="text-sm whitespace-pre-wrap"><span className="text-muted">Why join: </span>{bd.whyJoinRvx}</p>}
          {bd.howHeardAboutRvx && <p className="text-sm whitespace-pre-wrap"><span className="text-muted">How heard: </span>{bd.howHeardAboutRvx}</p>}
          {bd.gamePlanForward && <p className="text-sm whitespace-pre-wrap"><span className="text-muted">Game plan: </span>{bd.gamePlanForward}</p>}
        </Section>
      )}
    </PageShell>
  );
}
