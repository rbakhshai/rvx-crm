/**
 * Route-group gate: every page under /search (list, detail, sub-routes)
 * requires view_pipeline. Nav already hides the link; this stops typed URLs.
 */
import { gatePage } from "@/lib/page-gate";

export default async function GateLayout({ children }: { children: React.ReactNode }) {
  await gatePage("view_pipeline");
  return children;
}
