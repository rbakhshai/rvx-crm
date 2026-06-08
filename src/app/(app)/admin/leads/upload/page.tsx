/**
 * /admin/leads/upload — bulk-upload a CSV of raw leads to the BD pool.
 *
 * Permission: admin / acquisitions_manager only (re-uses manage_users).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../../page-shell";
import { CsvUploadForm } from "./upload-form";

export default async function UploadLeadsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "manage_users"))) {
    return (
      <PageShell title="Upload Leads" subtitle="You don't have permission to upload leads.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;Manage users&quot; capability.</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Upload Leads"
      subtitle="Import a CSV of raw leads into the BD pool. Dedup on physical address — duplicates of existing leads are silently skipped."
      action={
        <Link href="/admin/leads" className="text-xs text-muted hover:text-foreground hover:underline">
          ← Back to pool
        </Link>
      }
    >
      <CsvUploadForm />

      <div className="mt-10 rounded-xl border border-border bg-foreground/[0.02] p-5">
        <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">
          Tips
        </div>
        <ul className="text-xs space-y-1 text-foreground/80 leading-relaxed">
          <li>
            <strong>Column names are flexible.</strong> &quot;Park Name&quot;, &quot;park_name&quot;, &quot;PARK&quot; — all recognized.
            Same for address (&quot;Street&quot;, &quot;Address&quot;), phone (&quot;Phone&quot;, &quot;Cell&quot;, &quot;Mobile&quot;), email, etc.
          </li>
          <li>
            <strong>Anything we don&apos;t recognize is kept.</strong> Unmapped columns get stashed in
            extra-data so nothing is lost — you can still see them on each lead&apos;s detail page.
          </li>
          <li>
            <strong>Dedup matches on physical address.</strong> Same street + city + state = same park
            = silently skipped (won&apos;t pollute the pool with duplicates).
          </li>
          <li>
            <strong>Rows without any identifying info are dropped.</strong> If a row has no park
            name, no address, no phone, and no email, it gets skipped (logged in the result panel).
          </li>
          <li>
            <strong>Bad batch? Undo it.</strong> Each upload gets a batch ID. If a CSV was garbage,
            go to /admin/leads and click &quot;Undo batch&quot; — it removes every lead from that batch that
            no one has called yet.
          </li>
        </ul>
      </div>
    </PageShell>
  );
}
