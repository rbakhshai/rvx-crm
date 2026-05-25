import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { StepIndicator } from "../../step-indicator";
import { QualifyingForm } from "./qualifying-form";

export const metadata = {
  title: "Qualifying — RV Park Exchange",
};

export default async function QualifyingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await db.select({ id: contacts.id, firstName: contacts.firstName }).from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!c) notFound();

  return (
    <main className="max-w-2xl mx-auto px-6 py-12 sm:py-16">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          One more step — your capital + experience.
        </h1>
        <p className="mt-2 text-foreground/70">
          This is how we match you with the right deals. Your information stays confidential.
        </p>
      </div>

      <StepIndicator current={3} />

      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8 shadow-sm">
        <QualifyingForm id={id} />
      </div>
    </main>
  );
}
