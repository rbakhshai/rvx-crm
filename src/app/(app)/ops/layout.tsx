/**
 * /ops — Ops Machine / Founder OS layout.
 *
 * Different visual language from the rest of the CRM: cleaner cream
 * surface, big serif-ish headings, lime-green accents. Top tab strip
 * spans the page (mirroring the screenshots you sent), with the
 * branding "Ops Machine" left and "Founder OS" right.
 */
import Link from "next/link";
import { OpsTabs } from "./ops-tabs";

const TABS = [
  { href: "/ops/command",     label: "Command" },
  { href: "/ops/level10",     label: "Level 10" },
  { href: "/ops/initiatives", label: "Initiatives" },
  { href: "/ops/team",        label: "Team" },
  { href: "/ops/success",     label: "Success" },
  { href: "/ops/recruiting",  label: "Recruiting" },
  { href: "/ops/journey",     label: "Journey" },
  { href: "/ops/flywheel",    label: "Flywheel" },
  { href: "/ops/strategy",    label: "Strategy" },
  { href: "/ops/vision",      label: "Vision" },
] as const;

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-foreground/[0.015]">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="rounded-2xl border border-border bg-background shadow-sm">
          {/* Brand row */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-border">
            <Link href="/ops/command" className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-lime-400" />
              <span className="text-sm font-semibold tracking-tight">Ops Machine</span>
            </Link>
            <span className="rounded-full bg-foreground/[0.05] text-[10px] uppercase tracking-widest text-muted px-2.5 py-1 font-medium">
              Founder OS
            </span>
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
