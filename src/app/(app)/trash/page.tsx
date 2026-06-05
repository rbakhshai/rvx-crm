/**
 * Trash — soft-deleted records across all four primary entities.
 * Items linger here until manually purged or auto-purged after 30 days.
 * Until then they can be restored with one click.
 */
import { desc, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { deals, contacts, companies, birdDogs, user as userTable } from "@/db/schema";
import { PageShell } from "../page-shell";
import { Avatar } from "@/components/avatar";
import { ConfirmButton } from "@/components/confirm-button";
import {
  restoreDealAction,
  purgeDealAction,
} from "../deals/actions";
import {
  restoreContactAction,
  purgeContactAction,
} from "../contacts/actions";
import {
  restoreCompanyAction,
  purgeCompanyAction,
} from "../companies/actions";
import {
  restoreBirdDogAction,
  purgeBirdDogAction,
} from "../bird-dogs/actions";

const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_AFTER_DAYS = 30;

function daysUntilPurge(deletedAt: Date | null): number {
  if (!deletedAt) return PURGE_AFTER_DAYS;
  const elapsed = (Date.now() - new Date(deletedAt).getTime()) / DAY_MS;
  return Math.max(0, Math.ceil(PURGE_AFTER_DAYS - elapsed));
}

function relativeAgo(d: Date | null): string {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const dangerBtn =
  "text-red-600 hover:text-red-700 text-xs font-medium underline-offset-2 hover:underline";

const restoreBtn =
  "rounded-md border border-border bg-foreground/[0.04] px-2.5 py-1 text-xs font-medium hover:bg-foreground/[0.08] transition";

function nameOf(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ") || "(unnamed)";
}

export default async function TrashPage() {
  const [deletedDeals, deletedContacts, deletedCompanies, deletedBirdDogs] = await Promise.all([
    db.select().from(deals).where(isNotNull(deals.deletedAt)).orderBy(desc(deals.deletedAt)),
    db.select().from(contacts).where(isNotNull(contacts.deletedAt)).orderBy(desc(contacts.deletedAt)),
    db.select().from(companies).where(isNotNull(companies.deletedAt)).orderBy(desc(companies.deletedAt)),
    db.select().from(birdDogs).where(isNotNull(birdDogs.deletedAt)).orderBy(desc(birdDogs.deletedAt)),
  ]);

  // Look up names of users who did the deleting
  const deleterIds = [
    ...new Set([
      ...deletedDeals.map((d) => d.deletedById),
      ...deletedContacts.map((d) => d.deletedById),
      ...deletedCompanies.map((d) => d.deletedById),
      ...deletedBirdDogs.map((d) => d.deletedById),
    ].filter((x): x is string => !!x)),
  ];
  const deleters = deleterIds.length
    ? await db.select({ id: userTable.id, name: userTable.name }).from(userTable).where(inArray(userTable.id, deleterIds))
    : [];
  const deleterMap = new Map(deleters.map((u) => [u.id, u.name]));

  const total =
    deletedDeals.length + deletedContacts.length + deletedCompanies.length + deletedBirdDogs.length;

  return (
    <PageShell
      title="Trash"
      subtitle={
        total === 0
          ? "Nothing in the trash. Deleted records appear here for 30 days."
          : `${total} item${total === 1 ? "" : "s"} · auto-purged after ${PURGE_AFTER_DAYS} days · restore anytime`
      }
    >
      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-foreground/[0.02]">
          <div className="text-2xl mb-2">🗑️</div>
          <p className="text-sm text-muted">The trash is empty.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {deletedDeals.length > 0 && (
            <TrashSection title="Deals" count={deletedDeals.length}>
              {deletedDeals.map((d) => {
                const title = d.name || d.parkAddress || "(unnamed deal)";
                const loc = [d.parkCity, d.parkState].filter(Boolean).join(", ");
                return (
                  <TrashRow
                    key={d.id}
                    title={title}
                    subtitle={loc || undefined}
                    deletedAt={d.deletedAt}
                    deletedByName={d.deletedById ? deleterMap.get(d.deletedById) ?? null : null}
                    deletedById={d.deletedById}
                    restoreAction={restoreDealAction.bind(null, d.id)}
                    purgeAction={purgeDealAction.bind(null, d.id)}
                    confirmText={`Permanently delete "${title}"? This cannot be undone.`}
                  />
                );
              })}
            </TrashSection>
          )}

          {deletedContacts.length > 0 && (
            <TrashSection title="Buyers" count={deletedContacts.length}>
              {deletedContacts.map((c) => (
                <TrashRow
                  key={c.id}
                  title={nameOf(c.firstName, c.lastName)}
                  subtitle={c.email ?? undefined}
                  deletedAt={c.deletedAt}
                  deletedByName={c.deletedById ? deleterMap.get(c.deletedById) ?? null : null}
                  deletedById={c.deletedById}
                  restoreAction={restoreContactAction.bind(null, c.id)}
                  purgeAction={purgeContactAction.bind(null, c.id)}
                  confirmText={`Permanently delete "${nameOf(c.firstName, c.lastName)}"? This cannot be undone.`}
                />
              ))}
            </TrashSection>
          )}

          {deletedCompanies.length > 0 && (
            <TrashSection title="Sellers" count={deletedCompanies.length}>
              {deletedCompanies.map((co) => (
                <TrashRow
                  key={co.id}
                  title={co.name}
                  subtitle={nameOf(co.sellerFirstName, co.sellerLastName)}
                  deletedAt={co.deletedAt}
                  deletedByName={co.deletedById ? deleterMap.get(co.deletedById) ?? null : null}
                  deletedById={co.deletedById}
                  restoreAction={restoreCompanyAction.bind(null, co.id)}
                  purgeAction={purgeCompanyAction.bind(null, co.id)}
                  confirmText={`Permanently delete "${co.name}"? This cannot be undone.`}
                />
              ))}
            </TrashSection>
          )}

          {deletedBirdDogs.length > 0 && (
            <TrashSection title="Bird dogs" count={deletedBirdDogs.length}>
              {deletedBirdDogs.map((b) => (
                <TrashRow
                  key={b.id}
                  title={nameOf(b.firstName, b.lastName)}
                  subtitle={b.email ?? undefined}
                  deletedAt={b.deletedAt}
                  deletedByName={b.deletedById ? deleterMap.get(b.deletedById) ?? null : null}
                  deletedById={b.deletedById}
                  restoreAction={restoreBirdDogAction.bind(null, b.id)}
                  purgeAction={purgeBirdDogAction.bind(null, b.id)}
                  confirmText={`Permanently delete "${nameOf(b.firstName, b.lastName)}"? This cannot be undone.`}
                />
              ))}
            </TrashSection>
          )}
        </div>
      )}
    </PageShell>
  );
}

function TrashSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted">{count} item{count === 1 ? "" : "s"}</span>
      </header>
      <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-background">
        {children}
      </div>
    </section>
  );
}

function TrashRow({
  title,
  subtitle,
  deletedAt,
  deletedByName,
  deletedById,
  restoreAction,
  purgeAction,
  confirmText,
}: {
  title: string;
  subtitle?: string;
  deletedAt: Date | null;
  deletedByName: string | null;
  deletedById: string | null;
  restoreAction: () => Promise<void>;
  purgeAction: () => Promise<void>;
  confirmText: string;
}) {
  const daysLeft = daysUntilPurge(deletedAt);
  return (
    <div className="px-4 py-3 flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{title}</div>
        {subtitle && <div className="text-[11px] text-muted truncate">{subtitle}</div>}
        <div className="text-[11px] text-muted mt-0.5 flex items-center gap-2">
          {deletedById && deletedByName && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={deletedByName} id={deletedById} size="xs" />
              {deletedByName}
            </span>
          )}
          <span>deleted {relativeAgo(deletedAt)}</span>
          <span className={daysLeft <= 7 ? "text-amber-700" : ""}>
            · auto-purges in {daysLeft}d
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <form action={restoreAction}>
          <button type="submit" className={restoreBtn}>↩ Restore</button>
        </form>
        <ConfirmButton
          action={purgeAction}
          label="Delete forever"
          confirmText={confirmText}
        />
      </div>
    </div>
  );
}
