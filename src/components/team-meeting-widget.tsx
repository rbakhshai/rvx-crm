/**
 * Team-meeting widget for /today.
 *
 * Surfaces the recurring team-meeting details (title, Zoom / call link,
 * supporting copy) so BDs landing on Today can join the weekly L10
 * without hunting through email. Admins (Reza, Erica) edit the strings
 * inline via EditableBlock — same ops_content pattern used everywhere
 * else, so no new migration or admin UI.
 *
 * Scopes:
 *   today.meeting.title   short label (e.g. "Weekly L10 — Mondays 10am PT")
 *   today.meeting.url     URL of the Zoom / Meet / Teams room (or registration)
 *   today.meeting.notes   optional paragraph (cadence, prep notes, etc.)
 *
 * Closes feedback #6000 (Erica).
 */
import { EditableBlock } from "./editable-block";
import { cn } from "@/lib/cn";

const REVALIDATE = "/today";

export function TeamMeetingWidget({
  canEdit,
  title,
  url,
  notes,
}: {
  /** True for admins — they get pencils + Add-link affordance. */
  canEdit: boolean;
  title: string;
  url: string;
  notes: string;
}) {
  const hasUrl = url.trim().length > 0;
  const hostLabel = hostFromUrl(url);

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-background p-4",
        // Subtle violet tint so the meeting card pops above neutral
        // widgets without screaming for attention.
        "ring-1 ring-violet-200/40 dark:ring-violet-500/[0.08]",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-[10px] uppercase tracking-widest text-violet-700 dark:text-violet-300 font-semibold">
          🎥 Team meeting
        </div>
        {hasUrl && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-md bg-violet-600 text-white px-3 py-1 text-xs font-semibold hover:bg-violet-700 transition shrink-0"
          >
            Join →
          </a>
        )}
      </div>

      {/* Title — inline-editable for admins, plain text for everyone else. */}
      <div className="text-sm font-bold text-foreground leading-snug">
        {canEdit ? (
          <EditableBlock
            scope="today.meeting.title"
            initial={title}
            revalidate={REVALIDATE}
            placeholder="Weekly L10 — Mondays 10am PT"
            variant="title"
          />
        ) : (
          title || <span className="text-muted italic">Weekly meeting</span>
        )}
      </div>

      {/* URL — admins edit inline; everyone sees the host label. */}
      <div className="mt-1 text-[11px] text-muted">
        {canEdit ? (
          <div className="flex items-baseline gap-1.5">
            <span>Link:</span>
            <EditableBlock
              scope="today.meeting.url"
              initial={url}
              revalidate={REVALIDATE}
              placeholder="https://us06web.zoom.us/…"
              variant="inline"
              className="font-mono text-[11px] break-all"
            />
          </div>
        ) : hostLabel ? (
          <span>{hostLabel}</span>
        ) : null}
      </div>

      {/* Optional body — kept short. */}
      {(canEdit || notes) && (
        <div className="mt-2 text-xs text-foreground/70 leading-snug">
          {canEdit ? (
            <EditableBlock
              scope="today.meeting.notes"
              initial={notes}
              revalidate={REVALIDATE}
              placeholder="Add cadence / prep notes / what to bring…"
              variant="block"
              multiline
            />
          ) : (
            notes
          )}
        </div>
      )}
    </section>
  );
}

/** Pretty-print the Zoom / Meet host so BDs know where the link goes. */
function hostFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("zoom"))          return "Zoom";
    if (u.hostname.includes("meet.google"))   return "Google Meet";
    if (u.hostname.includes("teams"))         return "Microsoft Teams";
    return u.hostname;
  } catch {
    return null;
  }
}
