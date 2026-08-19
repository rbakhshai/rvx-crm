import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { deals, messageTemplates } from "@/db/schema";
import { auth } from "@/lib/auth";
import { rankBuyersForDeal } from "@/lib/matching";
import { PageShell } from "../../../page-shell";
import { DispoClient } from "./dispo-client";
import { requirePagePermission } from "@/lib/page-guard";

export default async function DispoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("view_contacts");
  const { id } = await params;

  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [matches, templates] = await Promise.all([
    rankBuyersForDeal(id, 50),
    db.select().from(messageTemplates).orderBy(asc(messageTemplates.name)),
  ]);

  const buyers = matches.map(({ buyer, match }) => ({
    id: buyer.id,
    firstName: buyer.firstName,
    lastName: buyer.lastName,
    email: buyer.email,
    qualificationTier: buyer.qualificationTier,
    score: match.score,
    reasons: match.reasons,
  }));

  const title = deal.name || deal.parkAddress || "(unnamed deal)";
  const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return (
    <PageShell
      title={`Dispo — ${title}`}
      subtitle="Pick the buyers, tune the message, send."
      action={
        <Link href={`/deals/${id}`} className="text-sm text-muted hover:text-foreground self-center">
          ← Back to deal
        </Link>
      }
    >
      <DispoClient
        deal={{
          id: deal.id,
          name: deal.name,
          parkAddress: deal.parkAddress,
          parkCity: deal.parkCity,
          parkState: deal.parkState,
          listPrice: deal.listPrice,
          listNoi: deal.listNoi,
          padsCount: deal.padsCount,
          listCapRate: deal.listCapRate,
        }}
        buyers={buyers}
        templates={templates}
        sender={{
          name: session.user.name,
          firstName: session.user.name?.split(" ")[0] ?? null,
          email: session.user.email,
        }}
        appUrl={appUrl}
      />
    </PageShell>
  );
}
