"use client";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-foreground/[0.04] text-foreground hover:bg-foreground/[0.08] border border-border",
  ghost: "text-foreground/70 hover:bg-foreground/[0.05] hover:text-foreground",
  danger: "bg-red-600 text-white hover:bg-red-700",
  gold: "bg-gold text-gold-foreground hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-1.5 text-sm",
};

/**
 * Looks identical to LinkButton, but forces a full-page navigation via
 * window.location instead of Next's client router.
 *
 * Why: inside an intercepted-route drawer, clicking a Next <Link> to a
 * sibling route (e.g. /deals/<id>/edit while the drawer is showing
 * /deals/<id>) silently no-ops — the parallel-route resolver doesn't
 * cleanly hand off between the intercept and the new route. Hard nav
 * sidesteps the issue and just loads the target page fresh.
 *
 * Use only for in-drawer links to sibling routes. Anywhere else,
 * prefer LinkButton for client-side speed.
 */
export function HardNavButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = href;
      }}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {children}
    </a>
  );
}
