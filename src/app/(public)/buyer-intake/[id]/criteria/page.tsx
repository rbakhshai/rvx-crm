import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { StepIndicator } from "../../step-indicator";
import { CriteriaForm } from "./criteria-form";

export const metadata = {
  title: "Your buy box — RV Park Exchange",
};

export default async function CriteriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await db.select({ id: contacts.id, firstName: contacts.firstName }).from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!c) notFound();

  return (
    <main className="max-w-2xl mx-auto px-6 py-12 sm:py-16">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {c.firstName ? `${c.firstName}, what's your buy box?` : "What's your buy box?"}
        </h1>
        <p className="mt-2 text-foreground/70">We&apos;ll only send you parks that match.</p>
      </div>

      <StepIndicator current={2} />

      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8 shadow-sm">
        <CriteriaForm id={id} />
      </div>
    </main>
  );
}
