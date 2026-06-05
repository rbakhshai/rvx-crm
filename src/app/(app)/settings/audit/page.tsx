import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { SettingsShell } from "../settings-shell";

/**
 * Append-only feed of every administrative action: invites, role changes,
 * permission toggles, suspensions, deletions. Sorted newest-first.
 */
export default async function AuditLogPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  // Both manage_users and manage_roles admins can read the log.
  const canSee =
    (await hasPermission(session.user, "manage_users")) ||
    (await hasPermission(session.user, "manage_roles"));
  if (!canSee) {
    return (
      <SettingsShell active="/settings/audit" subtitle="You don't have permission to view the audit log.">
        <p className="text-sm text-muted">Audit visibility requires Manage users or Manage role permissions.</p>
      </SettingsShell>
    );
  }

  const rows = await db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(200);

  return (
    <SettingsShell
      active="/settings/audit"
      subtitle={`Last ${rows.length} admin event${rows.length === 1 ? "" : "s"} · newest first`}
    >
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center">
          <div className="text-3xl mb-3 opacity-70">📜</div>
          <p className="text-sm text-muted">No admin events yet. Invite someone or toggle a permission to see entries here.</p>
        </div>
      ) : (
        <ol className="divide-y divide-border border border-border rounded-xl bg-surface overflow-hidden">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3 flex items-start gap-3">
              <Avatar name={r.actorName ?? r.actorEmail ?? "?"} id={r.actorId} />
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{r.actorName ?? r.actorEmail}</span>{" "}
                  <span className="text-muted">{humanizeAction(r.action, r.meta)}</span>
                  {r.targetLabel && (
                    <>
                      {" "}
                      <span className="font-medium">{r.targetLabel}</span>
                    </>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                  <Badge tone="muted">{r.action}</Badge>
                  {r.targetKind && <span>· target: {r.targetKind}</span>}
                </div>
                {r.meta != null && Object.keys(r.meta as object).length > 0 && (
                  <details className="mt-1.5">
                    <summary className="text-[11px] text-muted cursor-pointer hover:text-foreground">
                      Details
                    </summary>
                    <pre className="mt-1 text-[11px] bg-foreground/[0.03] rounded p-2 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(r.meta, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </SettingsShell>
  );
}

function humanizeAction(action: string, meta: unknown): string {
  const m = (meta ?? {}) as Record<string, unknown>;
  switch (action) {
    case "user.invited":
      return `invited`;
    case "user.role_changed":
      return `changed role from ${m.from ?? "?"} to ${m.to ?? "?"} for`;
    case "user.suspended":
      return "suspended";
    case "user.unsuspended":
      return "unsuspended";
    case "user.deleted":
      return "deleted";
    case "user.restored":
      return "restored";
    case "user.purged":
      return "permanently deleted";
    case "role.permission_toggled":
      return `${m.enabled ? "granted" : "revoked"} "${m.permissionKey}" on`;
    case "role.reset_to_defaults":
      return "reset to defaults";
    default:
      return action;
  }
}
