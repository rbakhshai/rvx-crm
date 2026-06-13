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
   * leaving the other lenses visible to UW / Dispo / TC / S&M / Ops etc.
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
 * Sectioned sidebar — matches the org's mental model instead of one
 * flat 17-tab run (Reza, 2026-06-12: "seems messy and confusing"):
 *
 *   (no header)  — the daily drivers everyone opens first
 *   Deals        — the acquisition pipeline + the people in it
 *   BD Program   — the sourcing engine (BD-facing + manager-facing)
 *   Company      — command center, money, people-ops, the long game
 *   Admin        — Reza/Erica only (unchanged)
 *
 * Pure presentation: every URL and permission gate is unchanged, and a
 * section header only renders when the viewer can see something in it —
 * a BD still gets just Today + the BD Program block.
 */
type NavSection = {
  label: string | null;
  items: NavItem[];
  /** Roles that can see this section (null = everyone). */
  visibleToRoles?: string[] | null;
  /** Tailwind color for section header. */
  accentColor?: string;
};

const SECTIONS: NavSection[] = [
  {
    label: "Dashboards",
    items: [
      { href: "/dashboards/my", label: "My Dashboard", requires: "view_today" },
      { href: "/dashboards/company", label: "Company Dashboard", requires: "view_today" },
    ],
  },
  {
    label: "Company",
    accentColor: "text-amber-700 dark:text-amber-400",
    items: [
      {
        href: "/contacts",
        label: "Contacts",
        requires: "view_contacts",
        children: [
          { href: "/contacts",  label: "Buyers" },
          { href: "/companies", label: "Sellers" },
        ],
      },
      { href: "/trash",  label: "Trash",                  requires: "view_trash" },
    ],
  },
  {
    label: null,
    accentColor: "text-green-700 dark:text-green-400",
    items: [
      { href: "/pool",   label: "Pathway to Partnership", requires: "view_pool" },
    ],
  },
  {
    label: "Leadership",
    accentColor: "text-blue-700 dark:text-blue-400",
    visibleToRoles: ["admin", "acquisitions_manager", "bird_dog_manager", "cfo"],
    items: [
      { href: "/ops/level10",     label: "RVX OS",      requires: "view_mission_control" },
      { href: "/admin/revenue",   label: "Park Performance",  requires: "view_revenue" },
      { href: "/hires",           label: "New Hires",         requires: "view_hires" },
      { href: "/reimbursements",  label: "Reimbursements",    requires: "view_reimbursements" },
    ],
  },
  {
    label: "Acquisitions L1",
    accentColor: "text-purple-700 dark:text-purple-400",
    visibleToRoles: ["bd_level_1"],
    items: [
      { href: "/lead-work",      label: "Lead Work",   requires: "view_lead_work" },
      { href: "/my-leads",       label: "My Leads",    requires: "view_my_leads" },
    ],
  },
  {
    label: "Acquisitions L2",
    accentColor: "text-purple-700 dark:text-purple-400",
    visibleToRoles: ["bd_level_2"],
    items: [
      { href: "/lead-work",      label: "Lead Work",   requires: "view_lead_work" },
      { href: "/my-leads",       label: "My Leads",    requires: "view_my_leads" },
    ],
  },
  {
    label: "Closers L3",
    accentColor: "text-green-700 dark:text-green-400",
    visibleToRoles: ["closer"],
    items: [
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
        label: "Buyers",
        requires: "view_contacts",
        children: [
          { href: "/contacts", label: "Active buyers" },
        ],
      },
    ],
  },
  {
    label: "Underwriting",
    accentColor: "text-yellow-700 dark:text-yellow-400",
    visibleToRoles: ["underwriter"],
    items: [
      {
        href: "/triage",
        label: "LOI/PSA",
        requires: "view_pipeline",
        children: [
          { href: "/triage",      label: "Triage" },
          { href: "/deals",       label: "List view" },
          { href: "/deals/board", label: "Board view" },
        ],
      },
    ],
  },
  {
    label: "DD",
    accentColor: "text-gray-700 dark:text-gray-400",
    visibleToRoles: ["due_diligence"],
    items: [
      {
        href: "/triage",
        label: "Due Diligence",
        requires: "view_pipeline",
        children: [
          { href: "/triage",      label: "Triage" },
          { href: "/deals",       label: "List view" },
          { href: "/deals/board", label: "Board view" },
        ],
      },
    ],
  },
  {
    label: "Dispositions",
    accentColor: "text-lime-700 dark:text-lime-400",
    visibleToRoles: ["dispo_manager"],
    items: [
      {
        href: "/triage",
        label: "Pipeline",
        requires: "view_pipeline",
        children: [
          { href: "/triage",      label: "Triage" },
          { href: "/deals",       label: "List view" },
        ],
      },
    ],
  },
  {
    label: "Operations",
    accentColor: "text-pink-700 dark:text-pink-400",
    visibleToRoles: ["park_manager", "transaction_coord", "bird_dog_manager"],
    items: [
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
    ],
  },
  {
    label: "Finance",
    accentColor: "text-emerald-700 dark:text-emerald-400",
    visibleToRoles: ["cfo"],
    items: [
      { href: "/admin/revenue",   label: "Park Performance",  requires: "view_revenue" },
    ],
  },
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

  function sectionVisible(s: NavSection): boolean {
    if (s.visibleToRoles === null) return true;
    if (!s.visibleToRoles) return true;
    return role ? s.visibleToRoles.includes(role) : false;
  }

  function visibleChild(c: NavChild): boolean {
    if (!allowed(c.requires)) return false;
    if (c.hideForRoles && role && c.hideForRoles.includes(role)) return false;
    return true;
  }

  const visibleSections = SECTIONS
    .filter(sectionVisible)
    .map((s) => ({ ...s, items: s.items.filter((g) => allowed(g.requires)) }))
    .filter((s) => s.items.length > 0);
  const visibleAdmin = ADMIN_GROUPS.filter((g) => allowed(g.requires));

  return (
    <nav className="space-y-2 text-sm">
      {visibleSections.map((s, i) => (
        <div key={s.label ?? `section-${i}`}>
          {s.label && (
            <div className={(i > 0 ? "mt-5 " : "") + "mb-1 px-2.5 text-[10px] uppercase tracking-widest font-medium " + (s.accentColor ?? "text-muted")}>
              {s.label}
            </div>
          )}
          <div className="space-y-0.5">
            {s.items.map((g) => (
              <NavGroup key={g.label} group={g} pathname={pathname} visibleChild={visibleChild} />
            ))}
          </div>
        </div>
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
