/**
 * Cross-entity search. Hits deals / contacts / companies / bird-dogs with ILIKE
 * and returns a normalized result list for the Cmd-K palette and /search page.
 */
import { desc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { contacts, deals, companies, birdDogs } from "@/db/schema";

export type SearchResultKind = "deal" | "buyer" | "seller" | "bird_dog";

export type SearchResult = {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

const LIMIT_PER_KIND = 6;

function nameOf(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ") || "(unnamed)";
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const pat = `%${q}%`;

  const [dealRows, buyerRows, companyRows, birdDogRows] = await Promise.all([
    db
      .select({ id: deals.id, name: deals.name, parkAddress: deals.parkAddress, parkCity: deals.parkCity, parkState: deals.parkState })
      .from(deals)
      .where(or(ilike(deals.name, pat), ilike(deals.parkAddress, pat), ilike(deals.parkCity, pat)))
      .orderBy(desc(deals.createdAt))
      .limit(LIMIT_PER_KIND),
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, state: contacts.state })
      .from(contacts)
      .where(or(ilike(contacts.firstName, pat), ilike(contacts.lastName, pat), ilike(contacts.email, pat), ilike(contacts.phone, pat)))
      .orderBy(desc(contacts.createdAt))
      .limit(LIMIT_PER_KIND),
    db
      .select({ id: companies.id, name: companies.name, sellerFirstName: companies.sellerFirstName, sellerLastName: companies.sellerLastName, email: companies.email })
      .from(companies)
      .where(or(ilike(companies.name, pat), ilike(companies.sellerFirstName, pat), ilike(companies.sellerLastName, pat), ilike(companies.email, pat)))
      .orderBy(desc(companies.createdAt))
      .limit(LIMIT_PER_KIND),
    db
      .select({ id: birdDogs.id, firstName: birdDogs.firstName, lastName: birdDogs.lastName, email: birdDogs.email })
      .from(birdDogs)
      .where(or(ilike(birdDogs.firstName, pat), ilike(birdDogs.lastName, pat), ilike(birdDogs.email, pat)))
      .orderBy(desc(birdDogs.createdAt))
      .limit(LIMIT_PER_KIND),
  ]);

  const results: SearchResult[] = [];

  for (const d of dealRows) {
    const loc = [d.parkCity, d.parkState].filter(Boolean).join(", ");
    results.push({
      kind: "deal",
      id: d.id,
      title: d.name || d.parkAddress || "(unnamed deal)",
      subtitle: loc || d.parkAddress || undefined,
      href: `/deals/${d.id}`,
    });
  }
  for (const c of buyerRows) {
    results.push({
      kind: "buyer",
      id: c.id,
      title: nameOf(c.firstName, c.lastName),
      subtitle: [c.email, c.state].filter(Boolean).join(" · ") || undefined,
      href: `/contacts/${c.id}`,
    });
  }
  for (const c of companyRows) {
    const contact = nameOf(c.sellerFirstName, c.sellerLastName);
    results.push({
      kind: "seller",
      id: c.id,
      title: c.name,
      subtitle: contact !== "(unnamed)" ? `${contact}${c.email ? " · " + c.email : ""}` : c.email ?? undefined,
      href: `/companies/${c.id}`,
    });
  }
  for (const b of birdDogRows) {
    results.push({
      kind: "bird_dog",
      id: b.id,
      title: nameOf(b.firstName, b.lastName),
      subtitle: b.email ?? undefined,
      href: `/bird-dogs/${b.id}`,
    });
  }

  return results;
}
