"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; count?: number };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contacts", label: "Buyers" },
  { href: "/deals", label: "Deals" },
  { href: "/companies", label: "Sellers" },
  { href: "/bird-dogs", label: "Bird Dogs" },
  { href: "/tasks", label: "Tasks" },
  { href: "/notifications", label: "Notifications" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5 text-sm">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
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
      })}
    </nav>
  );
}
