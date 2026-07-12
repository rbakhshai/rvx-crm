/**
 * "Your next actions" — the first thing every role sees on /today.
 *
 * A dashboard opens with what to DO, not how we're doing: overdue tasks,
 * unread @mentions, approvals sitting on your step, deals going cold.
 * Stats stay below; this is the queue. Renders a friendly "desk clear"
 * line when there's genuinely nothing waiting.
 */
import { fetchNextActions, type NextAction } from "@/lib/next-actions";
import { PortalSection, PortalCard, QueueRow } from "./portal-kit";
import { cn } from "@/lib/cn";

const DOT: Record<NextAction["urgency"], string> = {
  rose: "bg-rose-500",
  amber: "bg-amber-400",
  gold: "bg-gold",
};

export async function NextActions({ userId, role }: { userId: string; role: string }) {
  const items = await fetchNextActions(userId, role).catch(() => [] as NextAction[]);

  return (
    <PortalSection
      title="Your next actions"
      hint={items.length > 0 ? `${items.length} waiting on you` : undefined}
    >
      <PortalCard>
        {items.length === 0 ? (
          <div className="py-1.5 text-sm text-muted">
            Desk clear — nothing overdue, nothing waiting on you. 🎉
          </div>
        ) : (
          <ul className="divide-y divide-border -my-1">
            {items.map((a) => (
              <li key={a.key}>
                <QueueRow
                  href={a.href}
                  primary={
                    <span className="inline-flex items-center gap-2">
                      <i className={cn("size-2 rounded-full shrink-0", DOT[a.urgency])} aria-hidden />
                      {a.title}
                    </span>
                  }
                  secondary={a.detail}
                  trailing={<span className="text-muted text-sm">→</span>}
                />
              </li>
            ))}
          </ul>
        )}
      </PortalCard>
    </PortalSection>
  );
}
