/**
 * Minimal layout for /onboarding — no sidebar, no nav. We want the
 * BD's first impression to be the orientation content, not 14 menu
 * items. Auth-gates to a signed-in user but doesn't apply the BD
 * portal redirect or the suspended-user check (those live in the
 * (app) layout; new BDs starting fresh won't be suspended).
 */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { SignOutButton } from "../(app)/sign-out-button";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-foreground/[0.02]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/rvx-logo.png" alt="RVX" width={32} height={32} className="size-8 rounded-md object-contain" />
            <div className="text-sm font-semibold">RV Park Exchange</div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>{session.user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
