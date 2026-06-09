"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PermissionKey } from "@/lib/permissions";

type NavChild = {
  href: string;
  label: string;
  requires?: PermissionKey;
  /**
   * Roles for which this child should NOT appear. Used to give Marco
   * (closer) and Reza (admin) a Triage-only Pipeline experience while
   * leaving the other lenses visible to UW / Dispo / TC / COS / COO etc.
   */
  hideForRoles?: string[];
};

type NavItem = {
  href: string;
  label: string;
  /** When set, the item belongs to a labeled group of children. */
  children?: NavChild[];
  /** Hide the whole group unless the user has this permission. */
  requires?: PermissionKey;
};

/**
 * 5-group information architecture, verb-driven not noun-driven:
 *   Today      — what needs me right now (default landing)
 *   Pipeline   — every active deal, three lenses (triage / list / board)
 *   Contacts   — buyers · sellers · bird dogs, unified directory
 *   Tasks      — full queue across every record
 *   Insights   — revenue + future analytics (admin only)
 *
 * Pipeline parent links to /triage so the default click lands on triage,
 * which is the daily-driver view for closers + admin.
 */
/**
 * Sidebar order matches the org's mental model: command-center first,
 * then daily-driver, then the work itself, then the people, then the
 * gated stuff at the bottom. Every entry's visibility is permission-
 * gated so admins can toggle from /settings/roles.
 */
const GROUPS: NavItem[] = [
  { href: "/ops/command", label: "Mission Control", requires: "view_mission_control" },
  { href: "/dashboard",   label: "Dashboard",       requires: "view_dashboard" },
  { href: "/today",       label: "Today",           requires: "view_today" },
  { href: "/tasks",       label: "Tasks",           requires: "view_tasks" },
  { href: "/issues",      label: "Issues",          requires: "view_issues" },
  {
    href: "/triage",
    label: "Pipeline",
    requires: "view_pipeline",
    children: [
      { href: "/triage",      label: "Triage" },
      { href: "/deals",       label: "List view" },
      { href: "/deals/board", label: "Board view" },
    ],
  },
  {
    href: "/contacts",
    label: "Contacts",
    requires: "view_contacts",
    children: [
      { href: "/contacts",  label: "Buyers" },
      { href: "/companies", label: "Sellers" },
    ],
  },
  { href: "/bird-dogs",    label: "Bird Dogs",        requires: "view_bird_dogs_directory" },
  { href: "/bd-triage",    label: "Lead Work" },
  { href: "/bd-leaderboard", label: "Leaderboard" },
  // Park Performance is renamed from Insights and gated to roles that
  // explicitly grant view_revenue (Reza/Marco/Kevin by default; Erica
  // intentionally not).
  { href: "/admin/revenue", label: "Park Performance", requires: "view_revenue" },
  { href: "/trash",         label: "Trash",            requires: "view_trash" },
];

const ADMIN_GROUPS: NavItem[] = [
  {
    href: "/settings/users",
    label: "Admin",
    requires: "manage_users",
    children: [
      { href: "/settings/users",    label: "Team & roles" },
      { href: "/settings/roles",    label: "Role permissions", requires: "manage_roles" },
      { href: "/settings/feedback", label: "Feedback queue" },
      { href: "/admin/leads",       label: "Lead pool" },
      { href: "/settings/audit",    label: "Audit log" },
    ],
  },
];

export function Nav({
  permissions,
  role,
}: {
  permissions: Partial<Record<PermissionKey, boolean>>;
  role: string | null | undefined;
}) {
  const pathname = usePathname();

  function allowed(req?: PermissionKey): boolean {
    if (!req) return true;
    return permissions[req] === true;
  }

  function visibleChild(c: NavChild): boolean {
    if (!allowed(c.requires)) return false;
    if (c.hideForRoles && role && c.hideForRoles.includes(role)) return false;
    return true;
  }

  const visibleGroups = GROUPS.filter((g) => allowed(g.requires));
  const visibleAdmin = ADMIN_GROUPS.filter((g) => allowed(g.requires));

  return (
    <nav className="space-y-2 text-sm">
      {visibleGroups.map((g) => (
        <NavGroup key={g.label} group={g} pathname={pathname} visibleChild={visibleChild} />
      ))}

      {visibleAdmin.length > 0 && (
        <>
          <div className="mt-5 mb-1 px-2.5 text-[10px] uppercase tracking-widest text-muted font-medium">
            Admin
          </div>
          {visibleAdmin.map((g) => (
            <NavGroup key={g.label} group={g} pathname={pathname} visibleChild={visibleChild} />
          ))}
        </>
      )}
    </nav>
  );
}

function NavGroup({
  group,
  pathname,
  visibleChild,
}: {
  group: NavItem;
  pathname: string;
  visibleChild: (c: NavChild) => boolean;
}) {
  const visibleChildren = (group.children ?? []).filter(visibleChild);
  const groupActive = isActive(pathname, group.href, visibleChildren.map((c) => c.href));
  // If only one child remains after gating, fold the group — the parent
  // already links to the same place, so a single child is visual noise.
  const hasChildren = visibleChildren.length > 1;

  return (
    <div>
      <Link
        href={group.href as never}
        className={
          "flex items-center justify-between rounded-md px-2.5 py-1.5 transition " +
          (groupActive && !hasChildren
            ? "bg-foreground/5 font-medium text-foreground"
            : "font-semibold text-foreground hover:bg-foreground/5")
        }
      >
        <span>{group.label}</span>
      </Link>
      {hasChildren && (
        <div className="mt-0.5 ml-1.5 pl-2.5 border-l border-border/80 space-y-0.5">
          {visibleChildren.map((c) => {
            const childActive = pathname === c.href || pathname.startsWith(c.href + "/");
            return (
              <Link
                key={c.href + c.label}
                href={c.href as never}
                className={
                  "block rounded-md px-2.5 py-1 text-[13px] transition " +
                  (childActive
                    ? "bg-foreground/5 font-medium text-foreground"
                    : "text-foreground/65 hover:bg-foreground/5 hover:text-foreground")
                }
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isActive(pathname: string, href: string, children?: string[]): boolean {
  if (pathname === href || pathname.startsWith(href + "/")) return true;
  if (children) return children.some((c) => pathname === c || pathname.startsWith(c + "/"));
  return false;
}
