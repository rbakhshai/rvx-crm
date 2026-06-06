import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/db";
import { rolePermissions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLES,
  type PermissionKey,
  type Role,
} from "@/lib/permissions";
import { SettingsShell } from "../settings-shell";
import {
  ensureRolePermissionsSeeded,
  setRolePermissionAction,
  resetRoleToDefaultsAction,
} from "../actions";

// Roles that show up in the matrix. We skip "bird_dog" since they don't
// access the internal CRM and showing them just dilutes the table.
const ROLES_IN_MATRIX = ROLES.filter((r) => r.value !== "bird_dog");

export default async function RolesSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "manage_roles"))) {
    return (
      <SettingsShell active="/settings/roles" subtitle="You don't have permission to manage roles.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;Manage role permissions&quot; capability.</p>
      </SettingsShell>
    );
  }

  // Seed any missing rows from code defaults, then load the live state.
  await ensureRolePermissionsSeeded();
  const rows = await db.select().from(rolePermissions);

  // Build a quick lookup: state[role][key] → enabled
  const state = new Map<string, boolean>();
  for (const r of rows) state.set(`${r.role}:${r.permissionKey}`, r.enabled);

  function isOn(role: Role, key: PermissionKey): boolean {
    return state.get(`${role}:${key}`) ?? DEFAULT_PERMISSIONS[role][key];
  }

  return (
    <SettingsShell
      active="/settings/roles"
      subtitle={`Toggle which permissions each role has. Changes save immediately.`}
    >
      {/*
        overflow-y-clip (not the default auto) so the container doesn't
        become its own vertical scroll context. Sticky header inside
        anchors to the page scroll instead, which is what we want.
      */}
      <div className="overflow-x-auto overflow-y-clip -mx-8 px-8">
        <table className="min-w-full text-xs border border-border rounded-lg bg-background">
          <thead>
            {/*
              Header row floats while you scroll. The app shell already has
              a 48px sticky bar at top-0, so we sit at top-12 to land just
              under it.
                - Column headers: sticky top-12, z-20, opaque background so
                  rows scrolling underneath don't bleed through.
                - Top-left "Permission" cell: sticky in BOTH directions
                  (left-0 + top-12) at z-30 so it stays above neighboring
                  sticky cells when both axes are scrolling.
            */}
            <tr className="border-b border-border">
              <th className="sticky left-0 top-12 bg-background px-3 py-2 text-left font-medium text-foreground min-w-[280px] z-30">
                Permission
              </th>
              {ROLES_IN_MATRIX.map((r) => (
                <th
                  key={r.value}
                  className="sticky top-12 bg-background px-2 py-2 text-center font-medium text-foreground whitespace-nowrap z-20"
                  title={r.description}
                >
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <>
                <tr key={`${group.label}-header`} className="bg-foreground/[0.02]">
                  <td colSpan={ROLES_IN_MATRIX.length + 1} className="sticky left-0 px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted font-semibold">
                    {group.label}
                  </td>
                </tr>
                {group.permissions.map((p) => (
                  <tr key={p.key} className="border-t border-border">
                    <td className="sticky left-0 bg-background px-3 py-2 text-foreground">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-[10px] text-muted">{p.description}</div>
                    </td>
                    {ROLES_IN_MATRIX.map((r) => {
                      const on = isOn(r.value, p.key);
                      return (
                        <td key={r.value} className="px-2 py-2 text-center">
                          <form action={setRolePermissionAction} className="inline-flex">
                            <input type="hidden" name="role" value={r.value} />
                            <input type="hidden" name="key" value={p.key} />
                            <input type="hidden" name="enabled" value={on ? "false" : "true"} />
                            <button
                              type="submit"
                              className={
                                "size-5 rounded-md flex items-center justify-center transition border " +
                                (on
                                  ? "bg-primary border-primary text-primary-foreground hover:opacity-90"
                                  : "border-border bg-background hover:border-primary text-transparent")
                              }
                              aria-label={`${on ? "Disable" : "Enable"} ${p.label} for ${r.label}`}
                            >
                              <svg viewBox="0 0 16 16" className="size-3" fill="none">
                                <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </form>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
            <tr className="bg-foreground/[0.02] border-t border-border">
              <td className="sticky left-0 bg-foreground/[0.02] px-3 py-2 text-[10px] uppercase tracking-widest text-muted font-semibold">
                Reset to defaults
              </td>
              {ROLES_IN_MATRIX.map((r) => (
                <td key={r.value} className="px-2 py-2 text-center">
                  <form action={resetRoleToDefaultsAction}>
                    <input type="hidden" name="role" value={r.value} />
                    <button type="submit" className="text-[10px] text-muted hover:text-foreground underline-offset-2 hover:underline">
                      Reset
                    </button>
                  </form>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted">
        Changes save instantly. To revert a role to factory defaults, click <strong>Reset</strong> in its column.
      </p>
    </SettingsShell>
  );
}
