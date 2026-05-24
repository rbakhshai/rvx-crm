import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { PageShell } from "../page-shell";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const name = session?.user.name ?? "there";
  const firstName = name.split(" ")[0];

  return (
    <PageShell
      title={`Welcome, ${firstName}`}
      subtitle={`Signed in as ${session?.user.email}`}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <StatCard label="Buyers" value="—" hint="Phase 1" />
        <StatCard label="Active deals" value="—" hint="Phase 1" />
        <StatCard label="Bird dogs" value="—" hint="Phase 1" />
        <StatCard label="Open tasks" value="—" hint="Phase 2" />
      </div>

      <section className="mt-8 rounded-xl border border-border bg-foreground/[0.02] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
          Build roadmap
        </h2>
        <ol className="mt-3 space-y-2 text-sm">
          <RoadmapRow current label="Phase 0" detail="Auth, schema, deploy plumbing" done />
          <RoadmapRow label="Phase 1" detail="Contacts · Deals · Companies · Bird Dogs (full schema + CRUD)" />
          <RoadmapRow label="Phase 2" detail="Pipeline kanban · activity feed · intake forms" />
          <RoadmapRow label="Phase 3" detail="Buyer ↔ Deal matching engine" />
          <RoadmapRow label="Phase 4" detail="Automations · dispo blast (Inngest + Postmark + Twilio)" />
          <RoadmapRow label="Phase 5" detail="Migrate from Ontraport · cutover" />
        </ol>
        <p className="mt-4 text-xs text-muted">
          Full plan in <span className="font-mono">spec/SPEC.md</span>.
        </p>
      </section>
    </PageShell>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border p-5">
      <div className="text-xs uppercase tracking-widest text-muted font-medium">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="text-[11px] text-muted">{hint}</div>}
      </div>
    </div>
  );
}

function RoadmapRow({
  label,
  detail,
  done,
  current,
}: {
  label: string;
  detail: string;
  done?: boolean;
  current?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={
          "mt-0.5 inline-flex size-4 shrink-0 rounded-full border " +
          (done
            ? "bg-green-500 border-green-500"
            : current
              ? "border-primary bg-primary/10"
              : "border-border")
        }
      />
      <div>
        <span className="font-medium">{label}</span>{" "}
        <span className="text-foreground/70">— {detail}</span>
      </div>
    </li>
  );
}
