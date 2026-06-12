/**
 * /ops/command moved to the standalone /mission-control page
 * (consolidation, 2026-06-12). Permanent redirect keeps old bookmarks
 * and stale ?period= links working.
 */
import { redirect } from "next/navigation";

export default function CommandRedirect() {
  redirect("/mission-control");
}
