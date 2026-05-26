"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; count?: number; adminOnly?: boolean };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/triage", label: "Triage" },
  { href: "/contacts", label: "Buyers" },
  { href: "/deals", label: "Deals" },
  { href: "/companies", label: "Sellers" },
  { href: "/bird-dogs", label: "Bird Dogs" },
  { href: "/tasks", label: "Tasks" },
  { href: "/notifications", label: "Notifications" },
];

const ADMIN_ITEMS: Item[] = [
  { href: "/admin/revenue", label: "Revenue" },
];

export function Nav({ role }: { role?: string }) {
  const pathname = usePathname();
  const isAdmin = role === "admin";

  return (
    <nav className="space-y-0.5 text-sm">
      {ITEMS.map((item) => (
        <NavItem key={item.href} item={item} pathname={pathname} />
      ))}

      {isAdmin && (
        <>
          <div className="mt-4 mb-1 px-2.5 text-[10px] uppercase tracking-widest text-muted font-medium">
            Admin
          </div>
          {ADMIN_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </>
      )}
    </nav>
  );
}

function NavItem({ item, pathname }: { item: Item; pathname: string }) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href as never}
      className={
        "flex items-center justify-between rounded-md px-2.5 py-1.5 transition " +
        (active
          ? "bg-foreground/5 font-medium text-foreground"
          : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground")
      }
    >
      <span>{item.label}</span>
      {item.count !== undefined && (
        <span className="text-xs text-muted tabular-nums">{item.count}</span>
      )}
    </Link>
  );
}
