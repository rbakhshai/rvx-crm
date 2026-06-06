"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function OpsTabs({ tabs }: { tabs: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 px-8 border-b border-border overflow-x-auto">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href as never}
            className={cn(
              "relative px-3 py-3 text-sm transition shrink-0",
              active
                ? "text-foreground font-semibold"
                : "text-foreground/60 hover:text-foreground",
            )}
          >
            <span>{t.label}</span>
            {active && (
              <span
                className="absolute left-3 right-3 -bottom-px h-0.5 bg-lime-400 rounded-full"
                aria-hidden
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
