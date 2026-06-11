/**
 * /ops — Ops Machine / Founder OS layout.
 *
 * Different visual language from the rest of the CRM: cleaner cream
 * surface, big serif-ish headings, lime-green accents. Top tab strip
 * spans the page (mirroring the screenshots you sent), with the
 * branding "Ops Machine" left and "Founder OS" right.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { OpsTabs } from "./ops-tabs";

const TABS = [
  { href: "/ops/command",     label: "Command" },
  { href: "/ops/level10",     label: "Level 10" },
  { href: "/ops/initiatives", label: "Initiatives" },
  { href: "/ops/team",        label: "Team" },
  { href: "/ops/success",     label: "Success" },
  { href: "/ops/journey",     label: "Journey" },
  { href: "/ops/flywheel",    label: "Flywheel" },
  { href: "/ops/strategy",    label: "Strategy" },
  { href: "/ops/vision",      label: "Vision" },
] as const;

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  // One gate covers all nine /ops/* tabs. Nav already hides the entry
  // without view_mission_control, but the layout enforces it so a
  // revoked role can't deep-link to /ops/command.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_mission_control"))) notFound();

  return (
    <div className="min-h-screen bg-foreground/[0.015]">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="rounded-2xl border border-border bg-background shadow-sm">
          {/* Brand row */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-border">
            <Link href="/ops/command" className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-lime-400" />
              <span className="text-sm font-semibold tracking-tight">RVX Operating System</span>
            </Link>
          </div>

          {/* Tabs */}
          <OpsTabs tabs={TABS as unknown as Array<{ href: string; label: string }>} />

          {/* Page content */}
          <div className="px-8 py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
