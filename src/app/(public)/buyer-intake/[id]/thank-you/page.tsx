import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";

export const metadata = {
  title: "Welcome to the private buyer list — RV Park Exchange",
};

export default async function BuyerThankYouPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await db.select({ firstName: contacts.firstName }).from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!c) notFound();

  return (
    <main className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="inline-flex size-14 rounded-full bg-green-100 border border-green-200 items-center justify-center text-2xl">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        {c.firstName ? `Welcome, ${c.firstName}.` : "You're on the list."}
      </h1>
      <p className="mt-4 text-foreground/70 max-w-md mx-auto">
        Your private buyer profile is live. We&apos;ll send you RV park deals matching your buy box as they come in.
      </p>

      <div className="mt-10 rounded-2xl border border-border bg-foreground/[0.02] p-6 text-left">
        <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">What happens next</h2>
        <ol className="mt-3 space-y-2.5 text-sm">
          <Step n={1} text="Marco or Reza personally reviews your profile." />
          <Step n={2} text="They&apos;ll reach out — usually within 24 hours — to introduce themselves and answer any questions." />
          <Step n={3} text="When a deal matches your buy box, you'll get a direct email with the financials and a link to dig deeper." />
          <Step n={4} text="Sign our NCNDA once and you get faster access to full deal financials going forward." />
        </ol>
      </div>

      <p className="mt-10 text-xs text-muted">
        Questions? Email{" "}
        <a href="mailto:buyers@rvparkexchange.com" className="text-primary hover:underline">buyers@rvparkexchange.com</a>.
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
