import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { SignOutButton } from "../(app)/sign-out-button";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/portal");

  // Find the bird_dogs row linked to this user (by userId or email match)
  const userId = session.user.id;
  const email = session.user.email;

  const [bd] = await db
    .select({ id: birdDogs.id, firstName: birdDogs.firstName, lastName: birdDogs.lastName, userId: birdDogs.userId, email: birdDogs.email })
    .from(birdDogs)
    .where(eq(birdDogs.userId, userId))
    .limit(1);

  // Fallback: if no userId link yet but email matches a bird_dogs row, auto-link.
  // Guarded to accounts that SHOULD become bird dogs (a fresh invite is
  // "viewer", or already bd-tier) — otherwise an internal user whose email
  // happens to match a bird_dogs record would be silently demoted to
  // bird_dog and locked into the portal.
  let linkedBd = bd ?? null;
  const currentRole = (session.user as { role?: string }).role ?? "viewer";
  const eligibleForAutoLink =
    currentRole === "viewer" || currentRole === "bird_dog" || currentRole.startsWith("bd_level_");
  if (!linkedBd && email && eligibleForAutoLink) {
    const [byEmail] = await db
      .select({ id: birdDogs.id, firstName: birdDogs.firstName, lastName: birdDogs.lastName })
      .from(birdDogs)
      .where(eq(birdDogs.email, email))
      .limit(1);
    if (byEmail) {
      await db.update(birdDogs).set({ userId, updatedAt: new Date() }).where(eq(birdDogs.id, byEmail.id));
      // Promote the auth user to the bird_dog role so the (app) layout
      // can route them straight here on subsequent logins.
      await db.update(userTable).set({ role: "bird_dog", updatedAt: new Date() }).where(eq(userTable.id, userId));
      linkedBd = { ...byEmail, userId, email };
    }
  }

  // If they're not a known bird dog, kick them to the internal CRM (or back home)
  if (!linkedBd) {
    redirect("/dashboard?notice=not-a-bird-dog");
  }

  const displayName = [linkedBd.firstName, linkedBd.lastName].filter(Boolean).join(" ") || "Bird Dog";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 shrink-0 border-r border-border bg-foreground/[0.02] flex flex-col">
        <div className="p-5 border-b border-border">
          <Link href="/portal" className="flex items-center gap-2.5">
            <Image
              src="/rvx-logo.png"
              alt="RVX"
              width={40}
              height={40}
              priority
              className="size-10 shrink-0 rounded-md object-contain"
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold">RVX Scout</div>
              <div className="text-[10px] uppercase tracking-widest text-muted">portal</div>
            </div>
          </Link>
        </div>
        <nav className="p-3 flex-1 space-y-0.5 text-sm">
          <Link href="/portal" className="block rounded-md px-2.5 py-1.5 hover:bg-foreground/5 text-foreground">
            My leads
          </Link>
          <Link href="/portal/submit-lead" className="block rounded-md px-2.5 py-1.5 hover:bg-foreground/5 text-foreground/70 hover:text-foreground">
            Submit a new lead
          </Link>
        </nav>
        <div className="p-3 border-t border-border">
          <div className="text-xs">
            <div className="font-medium text-foreground">{displayName}</div>
            <div className="text-muted truncate">{email}</div>
          </div>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
