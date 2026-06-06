import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { asc, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { ROLES } from "@/lib/permissions";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { ConfirmButton } from "@/components/confirm-button";
import { SettingsShell } from "../settings-shell";
import {
  setUserRoleAction,
  setUserSuspendedAction,
  deleteUserAction,
  restoreUserAction,
} from "../actions";
import { InviteUserForm } from "./invite-form";
import { ResetPasswordButton } from "./reset-password-button";

function relativeAgo(d: Date | null): string {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return new Date(d).toLocaleDateString();
}

export default async function UsersSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showDeleted = view === "deleted";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "manage_users"))) {
    return (
      <SettingsShell active="/settings/users" subtitle="You don't have permission to manage users.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;Manage users&quot; capability.</p>
      </SettingsShell>
    );
  }

  const users = await db
    .select()
    .from(userTable)
    .where(showDeleted ? isNotNull(userTable.deletedAt) : isNull(userTable.deletedAt))
    .orderBy(asc(userTable.name));

  const roleLabel = new Map(ROLES.map((r) => [r.value, r.label]));

  return (
    <SettingsShell
      active="/settings/users"
      subtitle={`${users.length} ${showDeleted ? "deleted" : "active"} member${users.length === 1 ? "" : "s"}`}
    >
      {!showDeleted && <InviteUserForm />}

      {/* Toggle: Active / Deleted */}
      <div className="flex items-center gap-2 mb-4 text-xs">
        <span className="text-muted">View:</span>
        <a
          href="/settings/users"
          className={
            "rounded-full px-2.5 py-0.5 border " +
            (!showDeleted ? "bg-foreground/[0.06] border-foreground/20" : "border-border text-muted hover:bg-foreground/[0.03]")
          }
        >
          Active
        </a>
        <a
          href="/settings/users?view=deleted"
          className={
            "rounded-full px-2.5 py-0.5 border " +
            (showDeleted ? "bg-foreground/[0.06] border-foreground/20" : "border-border text-muted hover:bg-foreground/[0.03]")
          }
        >
          Deleted
        </a>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-foreground/[0.02] text-left border-b border-border">
            <tr>
              <th className="px-4 py-2.5 text-xs font-medium text-muted">User</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted">Email</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted">Role</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted">Status</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted w-72 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  {showDeleted ? "No deleted users." : "No team members yet — invite someone above."}
                </td>
              </tr>
            )}
            {users.map((u) => {
              const isSelf = u.id === session.user.id;
              const isSuspended = !!u.suspendedAt;
              const isDeleted = !!u.deletedAt;

              return (
                <tr key={u.id} className={isDeleted ? "opacity-60" : ""}>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2">
                      <Avatar name={u.name} id={u.id} />
                      <span className="font-medium">{u.name}</span>
                      {isSelf && <span className="text-[10px] text-muted">(you)</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-xs">{roleLabel.get(u.role) ?? u.role}</td>
                  <td className="px-4 py-3 text-xs">
                    {isDeleted && (
                      <Badge tone="danger">Deleted {relativeAgo(u.deletedAt)}</Badge>
                    )}
                    {!isDeleted && isSuspended && (
                      <Badge tone="warning">Suspended {relativeAgo(u.suspendedAt)}</Badge>
                    )}
                    {!isDeleted && !isSuspended && (
                      <Badge tone="success">Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      {isDeleted ? (
                        <RestoreUserButton userId={u.id} userName={u.name} />
                      ) : (
                        <>
                          <ChangeRoleForm userId={u.id} currentRole={u.role} />
                          <ResetPasswordButton userId={u.id} userName={u.name} />
                          {!isSelf && (
                            <SuspendUserButton
                              userId={u.id}
                              userName={u.name}
                              suspended={isSuspended}
                            />
                          )}
                          {!isSelf && (
                            <DeleteUserButton userId={u.id} userName={u.name} />
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted">
        Suspended users can&apos;t log in but their data stays intact. Deleted users move to the &quot;Deleted&quot; tab — they can be restored anytime.
      </p>
    </SettingsShell>
  );
}

// ============================================================================
// Row actions
// ============================================================================

function ChangeRoleForm({ userId, currentRole }: { userId: string; currentRole: string }) {
  return (
    <form action={setUserRoleAction} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer w-36"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-xs font-medium hover:opacity-90 transition"
      >
        Save
      </button>
    </form>
  );
}

function SuspendUserButton({ userId, userName, suspended }: { userId: string; userName: string; suspended: boolean }) {
  const boundAction = setUserSuspendedAction.bind(null, userId, !suspended);
  return (
    <ConfirmButton
      action={boundAction}
      label={suspended ? "Unsuspend" : "Suspend"}
      confirmText={
        suspended
          ? `Restore login for "${userName}"?`
          : `Suspend "${userName}"? They won't be able to log in until unsuspended.`
      }
      className="rounded-md border border-border bg-foreground/[0.04] px-2 py-1 text-xs font-medium hover:bg-foreground/[0.08] transition"
      toastMessage={suspended ? "Login restored" : "User suspended"}
      toastDescription={suspended ? `${userName} can log in again.` : `${userName} can't log in until you unsuspend.`}
    />
  );
}

function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const boundAction = deleteUserAction.bind(null, userId);
  return (
    <ConfirmButton
      action={boundAction}
      label="Delete"
      confirmText={`Delete "${userName}"? They lose access immediately. You can restore from the Deleted tab.`}
      toastMessage="User deleted"
      toastDescription={`${userName} can no longer log in. Restore anytime from the Deleted tab.`}
    />
  );
}

function RestoreUserButton({ userId, userName }: { userId: string; userName: string }) {
  const boundAction = restoreUserAction.bind(null, userId);
  return (
    <ConfirmButton
      action={boundAction}
      label="↩ Restore"
      confirmText={`Restore "${userName}"? They'll be able to log in again.`}
      className="rounded-md border border-border bg-foreground/[0.04] px-2 py-1 text-xs font-medium hover:bg-foreground/[0.08] transition"
      toastMessage="User restored"
      toastDescription={`${userName} is active again.`}
    />
  );
}
