import Image from "next/image";
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
import { getPermissionsFor } from "@/lib/has-permission";

export default async function AppLayout(props: {
  children: React.ReactNode;
  /** Parallel slot for intercepted-route drawers (e.g. clicking a deal row). */
  drawer?: React.ReactNode;
}) {
  const { children, drawer } = props;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role;
  // Look up suspendedAt/deletedAt directly — Better Auth's session payload
  // doesn't carry them by default, and we want this check on every page.
  const [me] = await db
    .select({ suspendedAt: userTable.suspendedAt, deletedAt: userTable.deletedAt })
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
  const permissions = await getPermissionsFor(role);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-border bg-foreground/[0.02] flex flex-col">
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
          <Nav permissions={permissions} />
        </div>
        <div className="p-3 border-t border-border">
          <div className="text-xs">
            <div className="font-medium text-foreground">{session.user.name}</div>
            <div className="text-muted truncate">{session.user.email}</div>
            <div className="mt-1 inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-green-500" />
              <span className="text-muted capitalize">{(session.user as { role?: string }).role ?? "viewer"}</span>
            </div>
          </div>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 border-b border-border px-6 flex items-center gap-3 bg-background/95 backdrop-blur sticky top-0 z-10">
          <CommandPaletteTrigger />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      {/* Intercepted-route drawer (slot is empty unless an entity row was clicked) */}
      {drawer}
      <CommandPalette />
    </div>
  );
}
