/**
 * /dashboard is gone — its personal widgets were duplicates of /today
 * and its company widgets moved to /mission-control (consolidation,
 * 2026-06-12). Redirect is role-aware by construction: /today renders
 * the BD hub for BD seats and the leadership morning page for everyone
 * else.
 */
import { redirect } from "next/navigation";

export default function DashboardRedirect() {
  redirect("/today");
}
