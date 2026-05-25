/**
 * Interactive Google Map embed driven by an address string.
 *
 * - If GOOGLE_MAPS_API_KEY is set, renders an iframe via Google Maps Embed API.
 *   The key is exposed in the iframe src — that's how the Embed API works.
 *   Restrict the key in Google Cloud Console by HTTP referrer to your domains.
 * - If no key, falls back to a "Open in Google Maps" link so the UI doesn't
 *   look broken in dev.
 *
 * Server component — no client JS, no react state. The iframe handles
 * zoom/pan/satellite toggle natively.
 */

type Props = {
  /** Full address — we'll URL-encode it. */
  address: string | null | undefined;
  /** Optional explicit city/state to append if address is partial. */
  city?: string | null;
  state?: string | null;
  /** Height in px. Default 280. */
  height?: number;
  /** Embed mode — "place" centers on a search; "view" centers on lat/lng. */
  mode?: "place" | "satellite";
  className?: string;
};

export function GoogleMap({ address, city, state, height = 280, mode = "place", className }: Props) {
  const parts = [address, city, state].filter(Boolean).join(", ").trim();
  if (!parts) return null;

  const key = process.env.GOOGLE_MAPS_API_KEY;
  const linkHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;

  if (!key) {
    return (
      <div
        className={
          "rounded-lg border border-dashed border-border bg-foreground/[0.02] p-6 text-center " +
          (className ?? "")
        }
        style={{ minHeight: height }}
      >
        <p className="text-sm text-foreground/70">
          Map preview needs <code className="text-xs">GOOGLE_MAPS_API_KEY</code> in <code className="text-xs">.env.local</code>.
        </p>
        <a
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Open in Google Maps ↗
        </a>
      </div>
    );
  }

  const params = new URLSearchParams({
    key,
    q: parts,
  });
  if (mode === "satellite") params.set("maptype", "satellite");

  const src = `https://www.google.com/maps/embed/v1/place?${params.toString()}`;

  return (
    <div className={"rounded-lg overflow-hidden border border-border " + (className ?? "")}>
      <iframe
        title={`Map of ${parts}`}
        src={src}
        width="100%"
        height={height}
        style={{ border: 0, display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="px-3 py-1.5 border-t border-border bg-foreground/[0.02] text-[11px] text-muted flex items-center justify-between">
        <span className="truncate">{parts}</span>
        <a
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 hover:text-foreground"
        >
          Open larger ↗
        </a>
      </div>
    </div>
  );
}
