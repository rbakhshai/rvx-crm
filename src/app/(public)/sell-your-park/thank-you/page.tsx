export const metadata = {
  title: "Thanks — we got your information | RV Park Exchange",
};

export default function ThankYouPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="inline-flex size-14 rounded-full bg-green-100 border border-green-200 items-center justify-center text-2xl">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Got it. We&apos;ll be in touch.</h1>
      <p className="mt-4 text-foreground/70 max-w-md mx-auto">
        Marco or Reza will personally reach out within 24 hours to learn more about your park. In the meantime, your details are saved confidentially.
      </p>

      <div className="mt-10 rounded-2xl border border-border bg-foreground/[0.02] p-6 text-left">
        <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">What happens next</h2>
        <ol className="mt-3 space-y-2.5 text-sm">
          <Step n={1} text="We&apos;ll review what you sent and pull initial comps in your area." />
          <Step n={2} text="Marco or Reza will call or email to ask a few quick questions." />
          <Step n={3} text="If your park fits our buy box, we'll schedule a private deeper conversation — including any creative-financing options that work for both sides." />
          <Step n={4} text="If we move forward, we present an offer in writing. No commission, no pressure." />
        </ol>
      </div>

      <p className="mt-10 text-xs text-muted">
        Have a question right away? Email <a href="mailto:hello@rvparkexchange.com" className="text-primary hover:underline">hello@rvparkexchange.com</a>.
      </p>
    </main>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex size-5 shrink-0 rounded-full bg-primary text-primary-foreground items-center justify-center text-xs font-semibold">
        {n}
      </span>
      <span dangerouslySetInnerHTML={{ __html: text }} />
    </li>
  );
}
