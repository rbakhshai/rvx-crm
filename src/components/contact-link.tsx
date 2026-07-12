import { cn } from "@/lib/cn";

/**
 * Clickable email / phone value — mailto: and tel: links so a rep can
 * dial or draft in one click instead of copy-pasting.
 *
 * In DataTable columns, pair with `interactive: true` so the cell opts
 * out of the row-link wrapper (nested <a> is invalid HTML).
 */
export function ContactLink({
  kind,
  value,
  className,
}: {
  kind: "email" | "phone";
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return <span className="text-muted">—</span>;
  const href = kind === "email" ? `mailto:${value}` : `tel:${value.replace(/[^+\d]/g, "")}`;
  return (
    <a
      href={href}
      className={cn("hover:text-primary hover:underline underline-offset-2 transition", className)}
    >
      {value}
    </a>
  );
}
