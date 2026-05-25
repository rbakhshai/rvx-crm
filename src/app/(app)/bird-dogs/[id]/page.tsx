import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, birdDogStatuses } from "@/db/schema";
import { PageShell } from "../../page-shell";
import { LinkButton } from "@/components/button";
import { Badge } from "@/components/badge";
import { Section } from "@/components/section";
import {
  BD_ACQUISITION_LEVEL_OPTIONS,
  TRAINING_STATUS_OPTIONS,
} from "@/lib/options";

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

export default async function BirdDogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bd] = await db.select().from(birdDogs).where(eq(birdDogs.id, id)).limit(1);
  if (!bd) notFound();

  const statuses = await db.select().from(birdDogStatuses).orderBy(asc(birdDogStatuses.sortOrder));
  const statusLabel = new Map(statuses.map((s) => [s.code, s.label]));

  const name = [bd.firstName, bd.lastName].filter(Boolean).join(" ") || "(unnamed)";

  return (
    <PageShell
      title={name}
      subtitle={bd.email ?? "no email"}
      action={
        <div className="flex gap-2">
          <LinkButton href={`/bird-dogs/${bd.id}/edit`} variant="secondary" size="sm">
            Edit
          </LinkButton>
          <Link href="/bird-dogs" className="text-sm text-muted hover:text-foreground self-center">
            ← Back
          </Link>
        </div>
      }
    >
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
