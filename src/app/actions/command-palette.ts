"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { globalSearch, type SearchResult } from "@/lib/global-search";

/**
 * Called from the Cmd-K palette client component as a server action.
 * Authenticates, runs the cross-entity search, returns the result list.
 */
export async function searchCommandPaletteAction(query: string): Promise<SearchResult[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];
  return globalSearch(query);
}
