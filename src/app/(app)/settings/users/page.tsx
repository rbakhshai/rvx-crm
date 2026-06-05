import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { ROLES } from "@/lib/permissions";
import { Avatar } from "@/components/avatar";
import { SettingsShell } from "../settings-shell";
import { setUserRoleAction } from "../actions";

export default async function UsersSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "manage_users"))) {
    return (
      <SettingsShell active="/settings/users" subtitle="You don't have permission to manage users.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;Manage users&quot; capability.</p>
      </SettingsShell>
    );
  }

  const users = await db.select().from(userTable).orderBy(asc(userTable.name));

  const roleLabel = new Map(ROLES.map((r) => [r.value, r.label]));

  return (
    <SettingsShell
      active="/settings/users"
      subtitle={`${users.length} team member${users.length === 1 ? "" : "s"} · change a role to grant them that role's permissions.`}
    >
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-foreground/[0.02] text-left border-b border-border">
            <tr>
              <th className="px-4 py-2.5 text-xs font-medium text-muted">User</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted">Email</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted">Current role</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted w-64">Change role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const isSelf = u.id === session.user.id;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2">
                      <Avatar name={u.name} id={u.id} />
                      <span className="font-medium">{u.name}</span>
                      {isSelf && <span className="text-[10px] text-muted">(you)</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-xs">{roleLabel.get(u.role) ?? u.role}</td>
                  <td className="px-4 py-3">
                    <form action={setUserRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md bg-primary text-primary-foreground px-2.5 py-1 text-xs font-medium hover:opacity-90 transition"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted">
        Need to add a new team member? They sign up at <code>/login</code> with their email + password, then come back here and pick their role.
      </p>
    </SettingsShell>
  );
}
