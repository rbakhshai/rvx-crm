"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PermissionKey } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  /** When set, the item belongs to a labeled group of children. */
  children?: Array<{ href: string; label: string; requires?: PermissionKey }>;
  /** Hide the whole group unless the user has this permission. */
  requires?: PermissionKey;
};

/**
 * 5-group information architecture, verb-driven not noun-driven:
 *   Today      — what needs me right now (default landing)
 *   Pipeline   — every active deal, four lenses
 *   Contacts   — buyers · sellers · bird dogs, unified directory
 *   Tasks      — full queue across every record
 *   Insights   — revenue + future analytics (admin only)
 */
const GROUPS: NavItem[] = [
  { href: "/today", label: "Today" },
  {
    href: "/deals",
    label: "Pipeline",
    children: [
      { href: "/deals/board", label: "Board" },
      { href: "/deals", label: "List" },
      { href: "/triage", label: "Triage" },
    ],
  },
  {
    href: "/contacts",
    label: "Contacts",
    children: [
      { href: "/contacts", label: "Buyers" },
      { href: "/companies", label: "Sellers" },
      { href: "/bird-dogs", label: "Bird dogs" },
    ],
  },
  { href: "/tasks", label: "Tasks" },
  { href: "/trash", label: "Trash", requires: "view_trash" },
];

const ADMIN_GROUPS: NavItem[] = [
  {
    href: "/admin/revenue",
    label: "Insights",
    requires: "view_revenue",
    children: [{ href: "/admin/revenue", label: "Revenue", requires: "view_revenue" }],
  },
  {
    href: "/settings/roles",
    label: "Settings",
    requires: "manage_roles",
    children: [
      { href: "/settings/roles", label: "Role permissions", requires: "manage_roles" },
      { href: "/settings/users", label: "Team & roles", requires: "manage_users" },
    ],
  },
];

export function Nav({ permissions }: { permissions: Partial<Record<PermissionKey, boolean>> }) {
  const pathname = usePathname();

  function allowed(req?: PermissionKey): boolean {
    if (!req) return true;
    return permissions[req] === true;
  }

  const visibleGroups = GROUPS.filter((g) => allowed(g.requires));
  const visibleAdmin = ADMIN_GROUPS.filter((g) => allowed(g.requires));

  return (
    <nav className="space-y-2 text-sm">
      {visibleGroups.map((g) => (
        <NavGroup key={g.label} group={g} pathname={pathname} allowed={allowed} />
      ))}

      {visibleAdmin.length > 0 && (
        <>
          <div className="mt-5 mb-1 px-2.5 text-[10px] uppercase tracking-widest text-muted font-medium">
            Admin
          </div>
          {visibleAdmin.map((g) => (
            <NavGroup key={g.label} group={g} pathname={pathname} allowed={allowed} />
          ))}
        </>
      )}
    </nav>
  );
}

function NavGroup({
  group,
  pathname,
  allowed,
}: {
  group: NavItem;
  pathname: string;
  allowed: (req?: PermissionKey) => boolean;
}) {
  const visibleChildren = (group.children ?? []).filter((c) => allowed(c.requires));
  const groupActive = isActive(pathname, group.href, visibleChildren.map((c) => c.href));
  const hasChildren = visibleChildren.length > 0;

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
