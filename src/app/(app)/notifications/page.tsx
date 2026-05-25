import { desc, sql, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { PageShell } from "../page-shell";
import { Badge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";

type SearchParams = Promise<{ status?: string }>;

const statusTone: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  sent: "success",
  pending: "warning",
  failed: "danger",
  logged_only: "muted",
};

const statusLabel: Record<string, string> = {
  sent: "Sent",
  pending: "Queued",
  failed: "Failed",
  logged_only: "Logged only",
};

const kindLabel: Record<string, string> = {
  deal_ready_for_review: "Deal ready for UW",
  deal_status_changed: "Deal status changed",
  new_lead: "New lead",
  bird_dog_application: "Bird dog application",
};

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const { status } = await searchParams;

  const where = status ? eq(notifications.status, status as never) : undefined;

  const [rows, [{ count }], countsByStatus] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(where),
    db
      .select({ status: notifications.status, n: sql<number>`count(*)::int` })
      .from(notifications)
      .groupBy(notifications.status),
  ]);

  const countByStatus = new Map(countsByStatus.map((r) => [r.status, r.n]));
  const allCount = countsByStatus.reduce((sum, r) => sum + r.n, 0);

  const statusFilters: Array<{ key: string | null; label: string; count: number }> = [
    { key: null, label: "All", count: allCount },
    { key: "logged_only", label: "Logged only", count: countByStatus.get("logged_only") ?? 0 },
    { key: "pending", label: "Queued", count: countByStatus.get("pending") ?? 0 },
    { key: "sent", label: "Sent", count: countByStatus.get("sent") ?? 0 },
    { key: "failed", label: "Failed", count: countByStatus.get("failed") ?? 0 },
  ];

  return (
    <PageShell
      title="Notifications"
      subtitle="Outbound email + SMS queue. Phase 4 will wire real sending; today most rows are 'logged only' until you connect Gmail SMTP."
    >
      <div className="mb-4 flex items-center gap-2 text-xs">
        <span className="text-muted">Status:</span>
        {statusFilters.map((f) => {
          const active = status === f.key || (!status && f.key === null);
          const href = f.key ? `/notifications?status=${f.key}` : "/notifications";
          return (
            <Link
              key={f.label}
              href={href}
              className={
                "rounded-full px-2.5 py-0.5 border " +
                (active ? "bg-foreground/[0.06] border-foreground/20" : "border-border text-muted hover:bg-foreground/[0.03]")
              }
            >
              {f.label} <span className="opacity-60">({f.count})</span>
            </Link>
          );
        })}
      </div>

      {count === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="When you flag a deal as Ready for review, a notification will land here. Check 'Ready for review' on any deal and save to see it."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <div key={n.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={statusTone[n.status]}>{statusLabel[n.status]}</Badge>
                    <span className="text-[11px] text-muted">{kindLabel[n.kind] ?? n.kind}</span>
                    <span className="text-[11px] text-muted">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="font-medium text-sm">{n.subject}</div>
                  <div className="text-xs text-muted mt-0.5">→ {n.recipientEmail}</div>
                  <pre className="mt-2 text-xs text-foreground/70 whitespace-pre-wrap font-sans">
                    {n.bodyMd}
                  </pre>
                  {n.errorMessage && (
                    <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                      Error: {n.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
