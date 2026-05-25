import { ApplicationForm } from "./application-form";

export const metadata = {
  title: "Apply as a Bird Dog — RV Park Exchange",
  description: "Scout RV park acquisitions for RVX. Get paid finder fees on parks we close.",
};

export default function BirdDogApplyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-foreground/[0.03]">
          <span className="size-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium tracking-wide">Bird Dog application</span>
        </div>
        <h1 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight">
          Scout deals. Earn fees. <span className="text-gold">Join the RVX team.</span>
        </h1>
        <p className="mt-4 text-base text-foreground/70 max-w-xl mx-auto">
          Bird dogs are the front line of our acquisition pipeline. You find off-market RV parks
          worth pursuing, hand them to us, and earn a finder fee on every deal we close.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8 shadow-sm">
        <ApplicationForm />
      </div>

      <div className="mt-10 grid sm:grid-cols-3 gap-4 text-sm">
        <Card title="Training included" body="We give you the materials, scripts, and tracker. You bring the hustle." />
        <Card title="No quota" body="Submit what you find. Active scouts close 2–5 deals a year." />
        <Card title="Real fees" body="Paid per closed deal — direct deposit, no waiting on commission splits." />
      </div>
    </main>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-foreground/[0.015] p-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-muted mt-1 text-xs leading-relaxed">{body}</p>
    </div>
  );
}
