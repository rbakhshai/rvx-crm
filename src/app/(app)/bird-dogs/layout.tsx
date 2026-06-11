/**
 * Route-group gate: every page under /bird-dogs (list, detail, sub-routes)
 * requires view_bird_dogs_directory. Nav already hides the link; this stops typed URLs.
 */
import { gatePage } from "@/lib/page-gate";

export default async function GateLayout({ children }: { children: React.ReactNode }) {
  await gatePage("view_bird_dogs_directory");
  return children;
}
