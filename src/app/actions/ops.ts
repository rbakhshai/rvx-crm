"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { opsContent } from "@/db/schema";
import { auth } from "@/lib/auth";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
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
