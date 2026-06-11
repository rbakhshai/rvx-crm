"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { opsContent } from "@/db/schema";
import { auth } from "@/lib/auth";

/**
 * Roles allowed to edit ops_content (Mission Control text, Team depts,
 * onboarding copy, the Today meeting card). BD-tier seats can VIEW
 * Mission Control via standard nav, but letting 10 dialers rewrite the
 * company priorities inline is a week-one embarrassment waiting to
 * happen. Kerry (due_diligence) is intentionally out — content edits
 * are a leadership job; widen here if that changes.
 */
const OPS_EDITOR_ROLES = new Set([
  "admin",
  "acquisitions_manager", // Erica — Sales & Marketing
  "bird_dog_manager",     // Marco — Operations
  "cfo",                  // Kevin — Finance
  "park_manager",         // Lyn
]);

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  if (!OPS_EDITOR_ROLES.has((session.user as { role?: string }).role ?? "")) {
    throw new Error("Only leadership can edit this content");
  }
  return session.user;
}

/**
 * Upsert a single editable block. Called by the click-to-edit text
 * components every time a value changes. We revalidate the calling
 * page so the next render reflects the new value.
 */
export async function saveOpsBlockAction(
  scope: string,
  bodyMd: string,
  revalidate: string,
): Promise<{ ok: boolean }> {
  const user = await requireUser();

  // Scope is a structured key — reject anything weird to avoid letting
  // a hostile payload poison unrelated content.
  if (!/^[a-zA-Z0-9_.\-:]+$/.test(scope) || scope.length > 200) {
    return { ok: false };
  }

  await db
    .insert(opsContent)
    .values({ scope, bodyMd, updatedById: user.id })
    .onConflictDoUpdate({
      target: opsContent.scope,
      set: { bodyMd, updatedAt: new Date(), updatedById: user.id },
    });

  if (revalidate && revalidate.startsWith("/")) {
    revalidatePath(revalidate);
  }
  return { ok: true };
}
