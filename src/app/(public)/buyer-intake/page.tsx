import { Step1Form } from "./step1-form";
import { StepIndicator } from "./step-indicator";

export const metadata = {
  title: "Buyer intake — RV Park Exchange",
  description: "Get on the private buyer list. Receive RV park deals matching your buy-box before they hit the market.",
};

export default function BuyerIntakePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 sm:py-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-foreground/[0.03]">
          <span className="size-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium tracking-wide">Private buyer list</span>
        </div>
        <h1 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight">
          Get RV park deals <span className="text-gold">before</span> they hit the market.
        </h1>
        <p className="mt-3 text-base text-foreground/70">
          Tell us about you in 3 quick steps. We&apos;ll send only the parks that match your buy box.
        </p>
      </div>

      <StepIndicator current={1} />

      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8 shadow-sm">
        <Step1Form />
      </div>
    </main>
  );
}
