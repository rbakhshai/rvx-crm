import Link from "next/link";
import { rankDealsForBuyer } from "@/lib/matching";
import { Section } from "./section";
import { MatchScorePill } from "./match-score-pill";

export async function MatchingDeals({ contactId }: { contactId: string }) {
  const matches = await rankDealsForBuyer(contactId, 20);

  return (
    <Section
      title="Matching deals"
      description={
        matches.length === 0
          ? "No matches in the current pipeline. As new deals are added, they'll show up here when they fit this buyer's box."
          : `${matches.length} active deal${matches.length === 1 ? "" : "s"} in the pipeline that match this buyer.`
      }
    >
      {matches.length === 0 ? (
        <div className="text-xs text-muted text-center py-6">No matching deals yet.</div>
      ) : (
        <ol className="space-y-2">
          {matches.map(({ deal, match }) => {
            const title = deal.name || deal.parkAddress || "(unnamed deal)";
            const location = [deal.parkCity, deal.parkState].filter(Boolean).join(", ");
            const price = deal.agreedPurchasePrice ?? deal.listPrice;
            return (
              <li key={deal.id} className="rounded-lg border border-border p-3 hover:border-foreground/30 transition">
                <Link href={`/deals/${deal.id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{title}</span>
                        <MatchScorePill score={match.score} />
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {location || "no location"}
                        {price ? ` · $${Number(price).toLocaleString()}` : ""}
                        {deal.padsCount ? ` · ${deal.padsCount} pads` : ""}
                      </div>
                      {match.reasons.length > 0 && (
                        <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-foreground/70">
                          {match.reasons.map((r, i) => (
                            <li key={i}>· {r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
