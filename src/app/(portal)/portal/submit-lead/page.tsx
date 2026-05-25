import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { birdDogs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { LeadForm } from "./lead-form";

export default async function SubmitLeadPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [bd] = await db
    .select({
      firstName: birdDogs.firstName,
      lastName: birdDogs.lastName,
      email: birdDogs.email,
      cellPhone: birdDogs.cellPhone,
    })
    .from(birdDogs)
    .where(eq(birdDogs.userId, session.user.id))
    .limit(1);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="pb-6 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Submit a new lead</h1>
          <p className="text-sm text-muted mt-1">
            The more you fill in, the faster our team can run the numbers and decide whether to chase it.
          </p>
        </div>
        <Link href="/portal" className="text-sm text-muted hover:text-foreground self-center">
          ← Back to leads
        </Link>
      </header>

      <div className="pt-6">
        <LeadForm
          defaults={{
            repFirstName: bd?.firstName ?? "",
            repLastName: bd?.lastName ?? "",
            repPhone: bd?.cellPhone ?? "",
            repEmail: bd?.email ?? session.user.email ?? "",
          }}
        />
      </div>
    </div>
  );
}
