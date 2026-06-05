import { redirect } from "next/navigation";

/** /settings → /settings/roles (default tab) */
export default function SettingsPage() {
  redirect("/settings/roles" as never);
}
