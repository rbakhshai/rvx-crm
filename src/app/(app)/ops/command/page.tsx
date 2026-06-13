/**
 * /ops/command redirects to /ops/level10 (RVX OS).
 * Permanent redirect keeps old bookmarks working.
 */
import { redirect } from "next/navigation";

export default function CommandRedirect() {
  redirect("/ops/level10");
}
