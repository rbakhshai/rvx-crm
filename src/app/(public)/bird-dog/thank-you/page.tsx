/**
 * Application thank-you — two branches (Bird Dog spec Phase 1):
 *
 *   default          — qualified applicant (all 5 acknowledgments).
 *                      Next step: book the discovery call. The booking
 *                      URL is an ops_content block (bd.discovery_call_url)
 *                      Erica edits from /bd-team — no deploy needed.
 *
 *   ?path=referral   — didn't check all 5. Not a rejection page: we
 *                      offer the Referral Partner path (Buy Box +
 *                      submission link) so the relationship is kept
 *                      and deal flow continues.
 */
import { getOpsBlocks } from "@/lib/ops-content";
import { safeExternalUrl } from "@/lib/safe-url";

export const metadata = {
  title: "Application received — RV Park Exchange",
};

const REFERRAL_SUBMISSION_URL = "https://rvparkexchange.com/lead";

/** RVX Buy Box — sourced from rvparkexchange.com/lead. */
const BUY_BOX = [
  "Off-market only (not publicly listed)",
  "$1–10M purchase price preferred",
  "30+ pads, or at least $150k NOI / year",
  "No ground-up RV park developments",
  "No high-crime areas",
];

export default async function BirdDogThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string }>;
}) {
  const params = await searchParams;
  const referral = params.path === "referral";

  const blocks = await getOpsBlocks("bd.").catch(() => new Map<string, string>());
  // Sanitize before it lands in an href — this block is leadership-edited,
  // so reject anything that isn't a real http(s) link (no javascript:).
  const discoveryUrl = safeExternalUrl(blocks.get("bd.discovery_call_url"));

  if (referral) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex size-14 rounded-full bg-amber-100 border border-amber-200 items-center justify-center text-2xl">
          🤝
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Let&apos;s stay connected.</h1>
        <p className="mt-4 text-foreground/70 max-w-md mx-auto">
          The Active Bird Dog program asks for commitments that don&apos;t fit everyone&apos;s life
          right now — and that&apos;s completely fine. You can still get paid for deals you bring
          us as a <strong>Referral Partner</strong>: no quotas, no schedule, no exclusivity.
        </p>

        <div className="mt-10 rounded-2xl border border-border bg-foreground/[0.02] p-6 text-left">
          <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">
            What we buy — the RVX Buy Box
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {BUY_BOX.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-0.5 text-gold">◆</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 text-xs uppercase tracking-widest text-muted font-semibold">
            How to submit a lead
          </h2>
          <p className="mt-2 text-sm text-foreground/80">
            Know an owner who fits the Buy Box and is open to selling? Submit the park through
            our referral form — first valid submission gets the credit.
          </p>
          <a
            href={REFERRAL_SUBMISSION_URL}
            className="mt-4 inline-flex items-center rounded-md bg-gold text-gold-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
          >
            Submit a lead → rvparkexchange.com/lead
          </a>
        </div>

        <p className="mt-10 text-xs text-muted">
          Circumstances change — if you can commit to the full program later, you&apos;re welcome
          to <a href="/bird-dog" className="text-primary hover:underline">re-apply any time</a>.
          Questions? <a href="mailto:recruiting@rvparkexchange.com" className="text-primary hover:underline">recruiting@rvparkexchange.com</a>.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="inline-flex size-14 rounded-full bg-green-100 border border-green-200 items-center justify-center text-2xl">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Application received.</h1>
      <p className="mt-4 text-foreground/70 max-w-md mx-auto">
        You acknowledged all five program commitments — you&apos;re qualified for the next step:
        a short discovery call to confirm fit on both sides.
      </p>

      {discoveryUrl ? (
        <a
          href={discoveryUrl}
          className="mt-8 inline-flex items-center rounded-md bg-gold text-gold-foreground px-6 py-3 text-base font-semibold hover:opacity-90 transition"
        >
          📅 Book your discovery call →
        </a>
      ) : (
        <p className="mt-8 text-sm text-foreground/70">
          Our team will email you within a few days to schedule your discovery call.
        </p>
      )}

      <div className="mt-10 rounded-2xl border border-border bg-foreground/[0.02] p-6 text-left">
        <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">What happens next</h2>
        <ol className="mt-3 space-y-2.5 text-sm">
          <Step n={1} text="Our team reviews your application and Pace Morby community history." />
          <Step n={2} text="Discovery call — we confirm bandwidth and expectations, and answer your questions. It's a fit conversation, not a training session." />
          <Step n={3} text="If both sides want to move forward, we send the RVX Bird Dog Agreement." />
          <Step n={4} text="Signed agreement → CRM login, training video, scripts, Buy Box, and calling resources." />
        </ol>
      </div>

      <p className="mt-10 text-xs text-muted">
        Questions? Email <a href="mailto:recruiting@rvparkexchange.com" className="text-primary hover:underline">recruiting@rvparkexchange.com</a>.
      </p>
    </main>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex size-5 shrink-0 rounded-full bg-gold text-gold-foreground items-center justify-center text-xs font-semibold">
        {n}
      </span>
      <span>{text}</span>
    </li>
  );
}
