import Link from "next/link";
import { PageShell } from "../page-shell";

const TABS = [
  { href: "/settings/roles", label: "Role permissions" },
  { href: "/settings/users", label: "Team & roles" },
] as const;

export function SettingsShell({
  active,
  children,
  subtitle,
}: {
  active: "/settings/roles" | "/settings/users";
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <PageShell title="Settings" subtitle={subtitle} width="wide">
      <div className="border-b border-border mb-6 -mx-8 px-8">
        <div className="flex items-center gap-1">
          {TABS.map((t) => {
            const isActive = active === t.href;
            return (
              <Link
                key={t.href}
                href={t.href as never}
                className={
                  "px-3 py-2 text-sm border-b-2 transition " +
                  (isActive
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted hover:text-foreground")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </PageShell>
  );
}
