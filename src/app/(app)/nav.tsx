"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  /** When set, the item belongs to a labeled group of children. */
  children?: Array<{ href: string; label: string }>;
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
  { href: "/trash", label: "Trash" },
];

const ADMIN_GROUPS: NavItem[] = [
  {
    href: "/admin/revenue",
    label: "Insights",
    children: [{ href: "/admin/revenue", label: "Revenue" }],
  },
];

export function Nav({ role }: { role?: string }) {
  const pathname = usePathname();
  const isAdmin = role === "admin";

  return (
    <nav className="space-y-2 text-sm">
      {GROUPS.map((g) => (
        <NavGroup key={g.label} group={g} pathname={pathname} />
      ))}

      {isAdmin && (
        <>
          <div className="mt-5 mb-1 px-2.5 text-[10px] uppercase tracking-widest text-muted font-medium">
            Admin
          </div>
          {ADMIN_GROUPS.map((g) => (
            <NavGroup key={g.label} group={g} pathname={pathname} />
          ))}
        </>
      )}
    </nav>
  );
}

function NavGroup({ group, pathname }: { group: NavItem; pathname: string }) {
  const groupActive = isActive(pathname, group.href, group.children?.map((c) => c.href));
  const hasChildren = (group.children?.length ?? 0) > 0;

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
          {group.children!.map((c) => {
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
