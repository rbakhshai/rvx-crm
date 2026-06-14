/**
 * Role portal identity — the single source of truth for "who am I and
 * what does my home page look like." Every position gets a tailored
 * /today dashboard; this map gives each one a name, a tagline, an emoji,
 * and an accent color that matches the sidebar section it belongs to.
 *
 * Colors mirror Reza's sidebar scheme (2026-06-12):
 *   Company brown · Leadership blue · Bird Dogs dark-blue · Closers green
 *   Underwriters yellow · Due Diligence gray · Dispo lime · Operations magenta
 *
 * Accent classes are spelled out as full literal strings so Tailwind's
 * JIT keeps them — never build a class name by interpolation here.
 */

export type AccentName =
  | "amber" | "blue" | "indigo" | "green" | "yellow" | "gray" | "lime" | "pink" | "emerald";

export type AccentClasses = {
  /** Text color for the accent (headers, role badge text). */
  text: string;
  /** Soft tinted background (hero band, stat tiles). */
  softBg: string;
  /** Border in the accent. */
  border: string;
  /** Solid chip background + readable text (role badge). */
  chip: string;
  /** Gradient for the hero band. */
  heroGradient: string;
  /** Ring used to lift key cards. */
  ring: string;
  /** Stat tile number color. */
  statText: string;
};

export const ACCENTS: Record<AccentName, AccentClasses> = {
  amber: {
    text: "text-amber-700 dark:text-amber-300",
    softBg: "bg-amber-50/60 dark:bg-amber-500/[0.07]",
    border: "border-amber-300/60 dark:border-amber-500/30",
    chip: "bg-amber-600 text-white dark:bg-amber-500",
    heroGradient: "from-amber-100/80 via-amber-50/40 to-transparent dark:from-amber-500/[0.12] dark:via-amber-500/[0.04] dark:to-transparent",
    ring: "ring-amber-200/60 dark:ring-amber-500/20",
    statText: "text-amber-700 dark:text-amber-300",
  },
  blue: {
    text: "text-blue-700 dark:text-blue-300",
    softBg: "bg-blue-50/60 dark:bg-blue-500/[0.07]",
    border: "border-blue-300/60 dark:border-blue-500/30",
    chip: "bg-blue-600 text-white dark:bg-blue-500",
    heroGradient: "from-blue-100/80 via-blue-50/40 to-transparent dark:from-blue-500/[0.12] dark:via-blue-500/[0.04] dark:to-transparent",
    ring: "ring-blue-200/60 dark:ring-blue-500/20",
    statText: "text-blue-700 dark:text-blue-300",
  },
  indigo: {
    text: "text-indigo-700 dark:text-indigo-300",
    softBg: "bg-indigo-50/60 dark:bg-indigo-500/[0.07]",
    border: "border-indigo-300/60 dark:border-indigo-500/30",
    chip: "bg-indigo-700 text-white dark:bg-indigo-500",
    heroGradient: "from-indigo-100/80 via-indigo-50/40 to-transparent dark:from-indigo-500/[0.12] dark:via-indigo-500/[0.04] dark:to-transparent",
    ring: "ring-indigo-200/60 dark:ring-indigo-500/20",
    statText: "text-indigo-700 dark:text-indigo-300",
  },
  green: {
    text: "text-green-700 dark:text-green-300",
    softBg: "bg-green-50/60 dark:bg-green-500/[0.07]",
    border: "border-green-300/60 dark:border-green-500/30",
    chip: "bg-green-600 text-white dark:bg-green-500",
    heroGradient: "from-green-100/80 via-green-50/40 to-transparent dark:from-green-500/[0.12] dark:via-green-500/[0.04] dark:to-transparent",
    ring: "ring-green-200/60 dark:ring-green-500/20",
    statText: "text-green-700 dark:text-green-300",
  },
  emerald: {
    text: "text-emerald-700 dark:text-emerald-300",
    softBg: "bg-emerald-50/60 dark:bg-emerald-500/[0.07]",
    border: "border-emerald-300/60 dark:border-emerald-500/30",
    chip: "bg-emerald-600 text-white dark:bg-emerald-500",
    heroGradient: "from-emerald-100/80 via-emerald-50/40 to-transparent dark:from-emerald-500/[0.12] dark:via-emerald-500/[0.04] dark:to-transparent",
    ring: "ring-emerald-200/60 dark:ring-emerald-500/20",
    statText: "text-emerald-700 dark:text-emerald-300",
  },
  yellow: {
    text: "text-yellow-700 dark:text-yellow-300",
    softBg: "bg-yellow-50/60 dark:bg-yellow-500/[0.07]",
    border: "border-yellow-300/60 dark:border-yellow-500/30",
    chip: "bg-yellow-500 text-white dark:bg-yellow-500",
    heroGradient: "from-yellow-100/80 via-yellow-50/40 to-transparent dark:from-yellow-500/[0.12] dark:via-yellow-500/[0.04] dark:to-transparent",
    ring: "ring-yellow-200/60 dark:ring-yellow-500/20",
    statText: "text-yellow-700 dark:text-yellow-300",
  },
  gray: {
    text: "text-gray-700 dark:text-gray-300",
    softBg: "bg-gray-100/70 dark:bg-gray-500/[0.08]",
    border: "border-gray-300/70 dark:border-gray-500/30",
    chip: "bg-gray-700 text-white dark:bg-gray-600",
    heroGradient: "from-gray-200/70 via-gray-100/40 to-transparent dark:from-gray-500/[0.12] dark:via-gray-500/[0.04] dark:to-transparent",
    ring: "ring-gray-300/60 dark:ring-gray-500/20",
    statText: "text-gray-700 dark:text-gray-200",
  },
  lime: {
    text: "text-lime-700 dark:text-lime-300",
    softBg: "bg-lime-50/60 dark:bg-lime-500/[0.07]",
    border: "border-lime-300/60 dark:border-lime-500/30",
    chip: "bg-lime-600 text-white dark:bg-lime-500",
    heroGradient: "from-lime-100/80 via-lime-50/40 to-transparent dark:from-lime-500/[0.12] dark:via-lime-500/[0.04] dark:to-transparent",
    ring: "ring-lime-200/60 dark:ring-lime-500/20",
    statText: "text-lime-700 dark:text-lime-300",
  },
  pink: {
    text: "text-pink-700 dark:text-pink-300",
    softBg: "bg-pink-50/60 dark:bg-pink-500/[0.07]",
    border: "border-pink-300/60 dark:border-pink-500/30",
    chip: "bg-pink-600 text-white dark:bg-pink-500",
    heroGradient: "from-pink-100/80 via-pink-50/40 to-transparent dark:from-pink-500/[0.12] dark:via-pink-500/[0.04] dark:to-transparent",
    ring: "ring-pink-200/60 dark:ring-pink-500/20",
    statText: "text-pink-700 dark:text-pink-300",
  },
};

export type PortalIdentity = {
  /** Short department/role name shown in the badge. */
  roleLabel: string;
  /** Headline for the hero band — what this home page IS. */
  title: string;
  /** One-line description of the daily mission. */
  tagline: string;
  /** Emoji mark for the role. */
  icon: string;
  accent: AccentName;
};

/**
 * Identity per role. bd_level_* keep their own hub (bd-today.tsx) and are
 * intentionally absent — the dispatcher branches to them before this map.
 */
export const ROLE_PORTAL: Record<string, PortalIdentity> = {
  admin: {
    roleLabel: "CEO",
    title: "Command Center",
    tagline: "The whole company at a glance — leads, pipeline, parks, people.",
    icon: "🛰️",
    accent: "amber",
  },
  acquisitions_manager: {
    roleLabel: "Sales & Marketing",
    title: "Growth Command",
    tagline: "Your bird-dog engine, lead flow, and recruiting funnel.",
    icon: "📈",
    accent: "blue",
  },
  bird_dog_manager: {
    roleLabel: "Operations",
    title: "Operations Command",
    tagline: "Every deal in motion — closing, underwriting, escrow, close.",
    icon: "⚙️",
    accent: "pink",
  },
  cfo: {
    roleLabel: "Finance",
    title: "Finance Command",
    tagline: "Pipeline dollars, deals in escrow, closings, and the books.",
    icon: "💵",
    accent: "emerald",
  },
  park_manager: {
    roleLabel: "Park Manager",
    title: "Park Operations",
    tagline: "Your parks, performance, and what needs attention on-site.",
    icon: "🏕️",
    accent: "pink",
  },
  closer: {
    roleLabel: "Closer",
    title: "Closer Cockpit",
    tagline: "Your deals, your hottest buyers, your next conversation.",
    icon: "🤝",
    accent: "green",
  },
  underwriter: {
    roleLabel: "Underwriting",
    title: "Underwriting Desk",
    tagline: "Deals waiting on your Phase 2 review, oldest first.",
    icon: "📊",
    accent: "yellow",
  },
  due_diligence: {
    roleLabel: "Due Diligence",
    title: "Due Diligence Desk",
    tagline: "Deals in escrow and the inspection clocks ticking on them.",
    icon: "🔍",
    accent: "gray",
  },
  transaction_coord: {
    roleLabel: "Transactions",
    title: "Transaction Desk",
    tagline: "PSAs to write, escrow to open, paperwork to close.",
    icon: "📋",
    accent: "pink",
  },
  dispo_manager: {
    roleLabel: "Dispositions",
    title: "Disposition Desk",
    tagline: "Deals ready to route to the buyer network.",
    icon: "📤",
    accent: "lime",
  },
};

export function portalFor(role: string | null | undefined): PortalIdentity {
  return (role && ROLE_PORTAL[role]) || {
    roleLabel: "Team",
    title: "Your Workspace",
    tagline: "Tasks, leads, and the team's live activity.",
    icon: "🧭",
    accent: "blue",
  };
}
