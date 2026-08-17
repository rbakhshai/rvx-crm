import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { Nav } from "./nav";
import { SignOutButton } from "./sign-out-button";
import { CommandPalette } from "@/components/command-palette";
import { CommandPaletteTrigger } from "@/components/command-palette-trigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNavToggle } from "@/components/mobile-nav";
import { getPermissionsFor } from "@/lib/has-permission";
import { ROLES } from "@/lib/permissions";
import { FeedbackWidget } from "@/components/feedback-widget";
import { getActiveViewAs, VIEWABLE_ROLES } from "@/lib/view-as";
import { ViewAsPicker, ViewAsBanner } from "@/components/view-as";

/**
 * Map a DB role value to its display label. Falls back to "—" rather than
 * "Viewer" so users on the deprecated viewer role don't see a stale label.
 */
function roleLabelOf(role: string | null | undefined): string {
  if (!role) return "—";
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export default async function AppLayout(props: {
  children: React.ReactNode;
  /** Parallel slot for intercepted-route drawers (e.g. clicking a deal row). */
  drawer?: React.ReactNode;
}) {
  const { children, drawer } = props;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const realRole = (session.user as { role?: string }).role;
  // "View as": when the CEO is previewing another role, the whole shell
  // (nav, permissions, role chip) renders as that role. Suspension and
  // onboarding checks below stay on the REAL identity.
  const viewAs = await getActiveViewAs(realRole);
  const role = viewAs ?? realRole;
  // Look up suspendedAt/deletedAt directly — Better Auth's session payload
  // doesn't carry them by default, and we want this check on every page.
  const [me] = await db
    .select({
      suspendedAt: userTable.suspendedAt,
      deletedAt: userTable.deletedAt,
      onboardedAt: userTable.onboardedAt,
    })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);
  if (me?.suspendedAt || me?.deletedAt) {
    redirect("/login?reason=suspended");
  }
  // Bird dogs don't see the internal CRM — route them to their portal
  if (role === "bird_dog") {
    redirect("/portal");
  }
  // First-login orientation for BD-tier seats. (/onboarding lives
  // outside the (app) group so it has its own minimal layout — no
  // sidebar — and isn't subject to this same redirect, preventing a
  // loop. Once onboardedAt is set, the redirect stops firing.
  // Leadership tiers are exempted. (#5000)
  const isBdTier =
    role === "bd_level_1" || role === "bd_level_2" || role === "bd_level_3";
  if (isBdTier && !me?.onboardedAt) {
    redirect("/onboarding");
  }
  const permissions = await getPermissionsFor(role);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="mobile-nav w-60 shrink-0 border-r border-border bg-foreground/[0.02] flex flex-col">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Image
              src="/rvx-logo.png"
              alt="RVX"
              width={40}
              height={40}
              priority
              className="size-10 shrink-0 rounded-md object-contain"
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold">RVX CRM</div>
              <div className="text-[10px] uppercase tracking-widest text-muted">rvparkexchange</div>
            </div>
          </div>
        </div>
        <div className="p-3 flex-1">
          <Nav permissions={permissions} role={role} />
        </div>
        <div className="p-3 border-t border-border space-y-3">
          {/* View-As picker — REAL admins only, regardless of preview state,
              so the CEO always has the controls to switch / exit. */}
          {realRole === "admin" && (
            <ViewAsPicker roles={[...VIEWABLE_ROLES]} active={viewAs} />
          )}
          <div className="text-xs">
            <Link href={"/account" as never} className="group block" title="Account settings">
              <div className="font-medium text-foreground group-hover:underline underline-offset-2">{session.user.name}</div>
              <div className="text-muted truncate">{session.user.email}</div>
            </Link>
            <div className="mt-1 inline-flex items-center gap-1.5">
              <span className={viewAs ? "size-1.5 rounded-full bg-amber-500" : "size-1.5 rounded-full bg-green-500"} />
              <span className="text-muted">{roleLabelOf(role)}</span>
            </div>
          </div>
          <div>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        {viewAs && <ViewAsBanner label={roleLabelOf(viewAs)} />}
        <header className="h-12 border-b border-border px-3 sm:px-6 flex items-center gap-2 sm:gap-3 bg-background/95 backdrop-blur sticky top-0 z-10">
          <MobileNavToggle />
          <CommandPaletteTrigger />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      {/* Intercepted-route drawer (slot is empty unless an entity row was clicked) */}
      {drawer}
      <CommandPalette />
      {/* Floating ? button for in-app feature requests / bug reports.
          Defaults the name + email to the signed-in user; both stay
          editable so whoever's actually typing can correct. */}
      <FeedbackWidget
        defaultName={session.user.name}
        defaultEmail={session.user.email}
      />
    </div>
  );
}
