/**
 * Initial-based circular avatar with a deterministic color from the user id.
 * Server-component safe (no client hooks). Use everywhere we previously
 * showed plain "Marco" or "Reza" text — instant visual cue for "who owns this".
 */
import { cn } from "@/lib/cn";

// 12 palette colors — picked to be distinct on a light background, readable text.
const PALETTE = [
  "bg-rose-500/90",
  "bg-orange-500/90",
  "bg-amber-500/90",
  "bg-lime-500/90",
  "bg-emerald-500/90",
  "bg-teal-500/90",
  "bg-cyan-500/90",
  "bg-sky-500/90",
  "bg-indigo-500/90",
  "bg-violet-500/90",
  "bg-fuchsia-500/90",
  "bg-pink-500/90",
] as const;

/**
 * Per-person color overrides keyed by lowercase first name. Mirrors the
 * Mission Control / Command tab so a teammate's avatar reads the same
 * everywhere they appear in the CRM (drawer, deal owner badge, mention
 * chip, etc.). Add one line here to onboard a new teammate's color.
 *
 * `text` is included since Reza's bg-foreground inverts in dark mode and
 * needs explicit text-background. Most others can stay text-white.
 */
const NAME_OVERRIDES: Record<string, { bg: string; text: string }> = {
  reza:  { bg: "bg-foreground",  text: "text-background" },
  erica: { bg: "bg-pink-400",    text: "text-white" },
  marco: { bg: "bg-emerald-600", text: "text-white" },
  kerry: { bg: "bg-amber-800",   text: "text-white" },
  kevin: { bg: "bg-blue-500",    text: "text-white" },
};

function nameOverride(name: string | null | undefined): { bg: string; text: string } | null {
  const first = name?.split(/\s+/)[0]?.toLowerCase() ?? "";
  return NAME_OVERRIDES[first] ?? null;
}

function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return h >>> 0;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Size = "xs" | "sm" | "md" | "lg";

const sizeStyle: Record<Size, string> = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-7 text-[11px]",
  lg: "size-9 text-xs",
};

export function Avatar({
  name,
  id,
  size = "sm",
  title,
  className,
}: {
  /** Display name. Initials are derived from this. */
  name: string | null | undefined;
  /** Stable id used to pick the color. Falls back to the name. */
  id?: string | null;
  size?: Size;
  /** Hover tooltip — defaults to the full name. */
  title?: string;
  className?: string;
}) {
  // Per-person override (Reza/Erica/Marco/Kerry/Kevin) wins over the
  // hashed palette so the leadership team is visually consistent
  // everywhere they appear. New team members fall through to the
  // deterministic palette below.
  const override = nameOverride(name);
  const key = (id ?? name ?? "").toString();
  const bg = override?.bg ?? (key ? PALETTE[djb2(key) % PALETTE.length] : "bg-foreground/20");
  const text = override?.text ?? "text-white";
  return (
    <span
      title={title ?? name ?? undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold select-none shrink-0 ring-1 ring-black/5",
        bg,
        text,
        sizeStyle[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Stack of avatars (e.g. owner + ops owner on a deal). Overlaps slightly.
 */
export function AvatarStack({
  people,
  size = "sm",
}: {
  people: Array<{ id: string | null; name: string | null; label?: string }>;
  size?: Size;
}) {
  if (people.length === 0) return <span className="text-muted text-xs">—</span>;
  return (
    <span className="inline-flex -space-x-1.5">
      {people.map((p, i) => (
        <Avatar
          key={`${p.id ?? "_"}-${i}`}
          name={p.name}
          id={p.id}
          size={size}
          title={p.label ?? p.name ?? undefined}
        />
      ))}
    </span>
  );
}

/**
 * Avatar + name beside it. Used on detail pages where there's room to show
 * the full label.
 */
export function AvatarWithName({
  name,
  id,
  size = "sm",
  hint,
}: {
  name: string | null | undefined;
  id?: string | null;
  size?: Size;
  hint?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar name={name} id={id} size={size} />
      <span className="text-sm">
        {name ?? <span className="text-muted">unassigned</span>}
        {hint && <span className="text-[10px] text-muted ml-1">({hint})</span>}
      </span>
    </span>
  );
}
