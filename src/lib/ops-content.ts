/**
 * Server-side helpers for reading ops_content blocks. Pages load all of
 * their blocks in one round-trip via getOpsBlocks(prefix), then look up
 * each scope with the returned Map.
 *
 *   const blocks = await getOpsBlocks("command.");
 *   blocks.get("command.priority.1.title") ?? "Finish Marco onboarding"
 *
 * Default values live alongside their pages — never in this file — so
 * each tab's seed content is colocated with the JSX that renders it.
 */
import { like } from "drizzle-orm";
import { db } from "@/db";
import { opsContent } from "@/db/schema";

export async function getOpsBlocks(prefix: string): Promise<Map<string, string>> {
  const rows = await db
    .select({ scope: opsContent.scope, bodyMd: opsContent.bodyMd })
    .from(opsContent)
    .where(like(opsContent.scope, `${prefix}%`));
  return new Map(rows.map((r) => [r.scope, r.bodyMd]));
}
