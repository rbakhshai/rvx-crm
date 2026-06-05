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
  const key = (id ?? name ?? "").toString();
  const color = key ? PALETTE[djb2(key) % PALETTE.length] : "bg-foreground/20";
  return (
    <span
      title={title ?? name ?? undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-full text-white font-semibold select-none shrink-0 ring-1 ring-black/5",
        color,
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
