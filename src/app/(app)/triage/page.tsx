import Link from "next/link";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { birdDogs, companies, deals } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../page-shell";
import { GoogleMap } from "@/components/google-map";
import { listQueue, listQueueCounts, listStatusOptions } from "./actions";
import { QUEUE_LABELS, buildTriageUrl, type Queue } from "./lib";
import { TriageClient } from "./triage-client";

function isQueue(v: string | undefined): v is Queue {
  return v === "new" || v === "mine" || v === "stale";
}

export default async function TriagePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string }>;
}) {
  const params = await searchParams;
  const queue: Queue = isQueue(params.q) ? params.q : "new";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  // Same gate as the nav link (Company > Triage). Was session-only —
  // any signed-in account (incl. BD tiers) could open the closer cockpit.
  if (!(await hasPermission(session.user, "view_pipeline"))) notFound();

  const [queueRows, statusOptions, queueCounts] = await Promise.all([
    listQueue(queue, session.user.id),
    listStatusOptions(),
    listQueueCounts(session.user.id),
  ]);

  // Pick the current deal: ?id= if it's still in the queue, else first item.
  const currentId =
    (params.id && queueRows.find((d) => d.id === params.id)?.id) ??
    queueRows[0]?.id ??
    null;

  // Hydrate full detail for the current deal + bird dog + seller for tap-to-call
  let current = null;
  let birdDog: { id: string; firstName: string | null; lastName: string | null; cellPhone: string | null; email: string | null } | null = null;
  let seller: { id: string; name: string | null; sellerFirstName: string | null; sellerLastName: string | null; phone: string | null; email: string | null } | null = null;

  if (currentId) {
    const [row] = await db.select().from(deals).where(eq(deals.id, currentId)).limit(1);
    current = row ?? null;

    if (current?.birdDogId) {
      const [bd] = await db
        .select({
          id: birdDogs.id,
          firstName: birdDogs.firstName,
          lastName: birdDogs.lastName,
          cellPhone: birdDogs.cellPhone,
          email: birdDogs.email,
        })
        .from(birdDogs)
        .where(eq(birdDogs.id, current.birdDogId))
        .limit(1);
      birdDog = bd ?? null;
    }
    if (current?.sellerCompanyId) {
      const [sc] = await db
        .select({
          id: companies.id,
          name: companies.name,
          sellerFirstName: companies.sellerFirstName,
          sellerLastName: companies.sellerLastName,
          phone: companies.phone,
          email: companies.email,
        })
        .from(companies)
        .where(eq(companies.id, current.sellerCompanyId))
        .limit(1);
      seller = sc ?? null;
    }
  }

  const position = currentId ? queueRows.findIndex((d) => d.id === currentId) + 1 : 0;

  return (
    <PageShell
      title="Triage"
      subtitle="One deal at a time — call, log, advance, next."
      width="wide"
      action={<QueueTabs current={queue} counts={queueCounts} />}
    >
      {queueRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">Inbox zero 🎉</h2>
          <p className="mt-2 text-sm text-muted">
            Nothing in the <span className="font-medium">{QUEUE_LABELS[queue]}</span> queue.
          </p>
          <div className="mt-6 flex justify-center gap-2 text-sm">
            {(Object.keys(QUEUE_LABELS) as Queue[])
              .filter((q) => q !== queue)
              .map((q) => (
                <Link
                  key={q}
                  href={buildTriageUrl(q, null) as never}
                  className="rounded-md border border-border px-3 py-1.5 text-foreground/70 hover:bg-foreground/[0.04]"
                >
                  Try {QUEUE_LABELS[q]}
                </Link>
              ))}
          </div>
        </div>
      ) : !current ? (
        <div className="text-sm text-muted">Deal not found.</div>
      ) : (
        <TriageClient
          queue={queue}
          queueLength={queueRows.length}
          position={position}
          deal={{
            id: current.id,
            name: current.name,
            parkAddress: current.parkAddress,
            parkCity: current.parkCity,
            parkState: current.parkState,
            padsCount: current.padsCount,
            listPrice: current.listPrice,
            listNoi: current.listNoi,
            listCapRate: current.listCapRate,
            statusCode: current.statusCode,
            callDisposition: current.callDisposition,
            updateToBirdDog: current.updateToBirdDog,
            lastNote: current.lastNote,
            aiSummaryMd: current.aiSummaryMd,
            closerLastTouch: current.closerLastTouch?.toISOString() ?? null,
            createdAt: current.createdAt.toISOString(),
          }}
          birdDog={birdDog}
          emailWired={!!((process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) || process.env.RESEND_API_KEY)}
          seller={seller}
          statusOptions={statusOptions}
          mapSlot={
            current.parkAddress ? (
              <GoogleMap
                address={current.parkAddress}
                city={current.parkCity}
                state={current.parkState}
                height={220}
              />
            ) : null
          }
          queueRows={queueRows.map((r) => ({
            id: r.id,
            title: r.name || r.parkAddress || "(unnamed)",
            sub: [r.parkCity, r.parkState].filter(Boolean).join(", "),
            statusCode: r.statusCode,
            closerLastTouch: r.closerLastTouch?.toISOString() ?? null,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      )}
    </PageShell>
  );
}

function QueueTabs({ current, counts }: { current: Queue; counts: Record<Queue, number> }) {
  return (
    <div className="flex gap-1 text-xs">
      {(Object.keys(QUEUE_LABELS) as Queue[]).map((q) => {
        const active = q === current;
        const count = counts[q];
        return (
          <Link
            key={q}
            href={buildTriageUrl(q, null) as never}
            className={
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 border " +
              (active
                ? "border-primary/40 bg-primary/[0.06] text-primary"
                : "border-border text-foreground/70 hover:bg-foreground/[0.04]")
            }
          >
            <span>{QUEUE_LABELS[q]}</span>
            <span
              className={
                "tabular-nums rounded px-1.5 text-[10px] font-medium " +
                (active
                  ? "bg-primary/15 text-primary"
                  : "bg-foreground/[0.06] text-foreground/70")
              }
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
