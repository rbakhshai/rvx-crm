import Link from "next/link";
import { rankBuyersForDeal } from "@/lib/matching";
import { Section } from "./section";
import { MatchScorePill } from "./match-score-pill";

export async function MatchedBuyers({ dealId }: { dealId: string }) {
  const matches = await rankBuyersForDeal(dealId, 20);

  return (
    <Section
      title="Matched buyers"
      description={
        matches.length === 0
          ? "No matches yet. Fill in park state, price, and pads to start ranking buyers."
          : `${matches.length} buyer${matches.length === 1 ? "" : "s"} from the book match this deal. Click to view; pick a list to dispo.`
      }
    >
      {matches.length === 0 ? (
        <div className="text-xs text-muted text-center py-6">No matched buyers yet.</div>
      ) : (
        <ol className="space-y-2">
          {matches.map(({ buyer, match }) => {
            const name = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ") || "(unnamed)";
            return (
              <li key={buyer.id} className="rounded-lg border border-border p-3 hover:border-foreground/30 transition">
                <Link href={`/contacts/${buyer.id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{name}</span>
                        <MatchScorePill score={match.score} />
                        {buyer.qualificationTier && (
                          <span className="text-[10px] uppercase tracking-widest text-muted">
                            {buyer.qualificationTier.replace(/^tier_/, "tier ").replace(/_/g, " ").slice(0, 6)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {buyer.email}{buyer.pofAmount ? ` · POF $${Number(buyer.pofAmount).toLocaleString()}` : ""}
                      </div>
                      {match.reasons.length > 0 && (
                        <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-foreground/70">
                          {match.reasons.map((r, i) => (
                            <li key={i}>· {r}</li>
                          ))}
                        </ul>
                      )}
                      {match.warnings.length > 0 && (
                        <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-yellow-700">
                          {match.warnings.map((w, i) => (
                            <li key={i}>⚠ {w}</li>
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
