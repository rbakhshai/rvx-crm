import { SellerIntakeForm } from "./seller-form";

export const metadata = {
  title: "Sell your RV park — RV Park Exchange",
  description: "Tell us about your park. Confidential. We respond within 24 hours. No agency fees if we buy.",
};

export default function SellYourParkPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-foreground/[0.03]">
          <span className="size-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium tracking-wide">Direct buyer · No agent fees</span>
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-tight">
          Sell your <span className="text-primary">RV park</span>.
        </h1>
        <p className="mt-4 text-lg text-foreground/70 max-w-xl mx-auto">
          Confidential. No obligation. We get back to you within 24 hours — and if we buy, you don&apos;t pay a commission.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8 shadow-sm">
        <SellerIntakeForm />
      </div>

      <div className="mt-10 grid sm:grid-cols-3 gap-4 text-sm">
        <Reassurance
          title="Confidential"
          body="Your park stays off the public market until you say otherwise."
        />
        <Reassurance
          title="No commission"
          body="If we close on your park, you don't pay an agency fee or split."
        />
        <Reassurance
          title="24-hour response"
          body="Marco or Reza personally follows up within one business day."
        />
      </div>
    </main>
  );
}

function Reassurance({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-foreground/[0.015] p-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-muted mt-1 text-xs leading-relaxed">{body}</p>
    </div>
  );
}
