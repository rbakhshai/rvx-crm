import Link from "next/link";
import { and, ilike, isNull, or, desc } from "drizzle-orm";
import { db } from "@/db";
import { contacts, deals, companies, birdDogs } from "@/db/schema";
import { PageShell } from "../page-shell";
import { EmptyState } from "@/components/empty-state";

type SearchParams = Promise<{ q?: string }>;

function nameOf(first: string | null, last: string | null) {
  return [first, last].filter(Boolean).join(" ") || "(unnamed)";
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim() ?? "";

  if (!q) {
    return (
      <PageShell title="Search" subtitle="Find buyers, deals, sellers, and bird dogs.">
        <EmptyState
          title="Type a search term"
          description="Search by name, email, phone, park address, or city. Use the bar at the top of the page."
        />
      </PageShell>
    );
  }

  const pat = `%${q}%`;

  const [buyerRows, dealRows, companyRows, birdDogRows] = await Promise.all([
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, state: contacts.state })
      .from(contacts)
      .where(and(or(ilike(contacts.firstName, pat), ilike(contacts.lastName, pat), ilike(contacts.email, pat), ilike(contacts.phone, pat)), isNull(contacts.deletedAt)))
      .orderBy(desc(contacts.createdAt))
      .limit(10),
    db
      .select({ id: deals.id, name: deals.name, parkAddress: deals.parkAddress, parkCity: deals.parkCity, parkState: deals.parkState })
      .from(deals)
      .where(and(or(ilike(deals.name, pat), ilike(deals.parkAddress, pat), ilike(deals.parkCity, pat)), isNull(deals.deletedAt)))
      .orderBy(desc(deals.createdAt))
      .limit(10),
    db
      .select({ id: companies.id, name: companies.name, sellerFirstName: companies.sellerFirstName, sellerLastName: companies.sellerLastName, email: companies.email })
      .from(companies)
      .where(and(or(ilike(companies.name, pat), ilike(companies.sellerFirstName, pat), ilike(companies.sellerLastName, pat), ilike(companies.email, pat)), isNull(companies.deletedAt)))
      .orderBy(desc(companies.createdAt))
      .limit(10),
    db
      .select({ id: birdDogs.id, firstName: birdDogs.firstName, lastName: birdDogs.lastName, email: birdDogs.email })
      .from(birdDogs)
      .where(and(or(ilike(birdDogs.firstName, pat), ilike(birdDogs.lastName, pat), ilike(birdDogs.email, pat)), isNull(birdDogs.deletedAt)))
      .orderBy(desc(birdDogs.createdAt))
      .limit(10),
  ]);

  const total = buyerRows.length + dealRows.length + companyRows.length + birdDogRows.length;

  return (
    <PageShell title={`Search: "${q}"`} subtitle={`${total} match${total === 1 ? "" : "es"} across all records`}>
      {total === 0 ? (
        <EmptyState
          title="No matches"
          description="Try a different search term, or add records to your CRM first."
        />
      ) : (
        <div className="space-y-8">
          <ResultSection
            title="Buyers"
            count={buyerRows.length}
            seeAllHref={`/contacts?q=${encodeURIComponent(q)}`}
            rows={buyerRows.map((r) => ({
              key: r.id,
              href: `/contacts/${r.id}`,
              primary: nameOf(r.firstName, r.lastName),
              secondary: [r.email, r.state].filter(Boolean).join(" · "),
            }))}
          />
          <ResultSection
            title="Deals"
            count={dealRows.length}
            seeAllHref={`/deals?q=${encodeURIComponent(q)}`}
            rows={dealRows.map((r) => ({
              key: r.id,
              href: `/deals/${r.id}`,
              primary: r.name || r.parkAddress || "(unnamed deal)",
              secondary: [r.parkCity, r.parkState].filter(Boolean).join(", "),
            }))}
          />
          <ResultSection
            title="Sellers"
            count={companyRows.length}
            seeAllHref={`/companies?q=${encodeURIComponent(q)}`}
            rows={companyRows.map((r) => ({
              key: r.id,
              href: `/companies/${r.id}`,
              primary: r.name,
              secondary: [nameOf(r.sellerFirstName, r.sellerLastName), r.email].filter(Boolean).join(" · "),
            }))}
          />
          <ResultSection
            title="Bird dogs"
            count={birdDogRows.length}
            seeAllHref={`/bird-dogs?q=${encodeURIComponent(q)}`}
            rows={birdDogRows.map((r) => ({
              key: r.id,
              href: `/bird-dogs/${r.id}`,
              primary: nameOf(r.firstName, r.lastName),
              secondary: r.email ?? "",
            }))}
          />
        </div>
      )}
    </PageShell>
  );
}

function ResultSection({
  title,
  count,
  rows,
  seeAllHref,
}: {
  title: string;
  count: number;
  rows: Array<{ key: string; href: string; primary: string; secondary: string }>;
  seeAllHref: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold">{title} <span className="text-muted tabular-nums">({count})</span></h3>
        <Link href={seeAllHref as never} className="text-xs text-muted hover:text-foreground">See all matches →</Link>
      </div>
      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
        {rows.map((r) => (
          <Link key={r.key} href={r.href as never} className="block px-4 py-2.5 hover:bg-foreground/[0.02]">
            <div className="text-sm font-medium">{r.primary}</div>
            {r.secondary && <div className="text-xs text-muted mt-0.5">{r.secondary}</div>}
          </Link>
        ))}
      </div>
    </section>
  );
}
