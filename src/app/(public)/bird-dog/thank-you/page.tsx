export const metadata = {
  title: "Application received — RV Park Exchange",
};

export default function BirdDogThankYouPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="inline-flex size-14 rounded-full bg-green-100 border border-green-200 items-center justify-center text-2xl">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Application received.</h1>
      <p className="mt-4 text-foreground/70 max-w-md mx-auto">
        Our team personally reviews every application. You&apos;ll hear back within a few days if we have open positions that fit.
      </p>

      <div className="mt-10 rounded-2xl border border-border bg-foreground/[0.02] p-6 text-left">
        <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">What happens next</h2>
        <ol className="mt-3 space-y-2.5 text-sm">
          <Step n={1} text="Our team reviews your application and Pace Morby community history." />
          <Step n={2} text="If we&apos;re a fit and have an open position, we&apos;ll email you to schedule an intro Zoom call." />
          <Step n={3} text="On the call we walk through how RVX works and what bird dogs do day-to-day." />
          <Step n={4} text="If both sides want to move forward, we send the agreement, onboarding packet, and Discord invite." />
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
      <span dangerouslySetInnerHTML={{ __html: text }} />
    </li>
  );
}
