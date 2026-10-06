/**
 * /admin/leads/[id] — lead detail. The pool table linked here since day
 * one, but the route never existed (Kevin's launch finding, 2026-10-05:
 * every row 404'd). Read-only view of everything we know about a lead,
 * including the unmapped CSV columns preserved in rawData — which is
 * the whole reason Kevin wanted the page.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { rawLeads, rawLeadDispositions, user as userTable } from "@/db/schema";
import { requirePagePermission } from "@/lib/page-guard";
import { PageShell } from "../../../page-shell";
import { ContactLink } from "@/components/contact-link";
import { fmtDate, fmtRelative } from "@/lib/date-format";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("view_mission_control");
  const { id } = await params;

  const [lead] = await db.select().from(rawLeads).where(eq(rawLeads.id, id)).limit(1);
  if (!lead || lead.deletedAt) notFound();

  const [users, dispositions] = await Promise.all([
    db.select({ id: userTable.id, name: userTable.name }).from(userTable),
    db
      .select({
        id: rawLeadDispositions.id,
        outcome: rawLeadDispositions.outcome,
        notes: rawLeadDispositions.notes,
        createdAt: rawLeadDispositions.createdAt,
        byUserId: rawLeadDispositions.byUserId,
      })
      .from(rawLeadDispositions)
      .where(eq(rawLeadDispositions.rawLeadId, id))
      .orderBy(desc(rawLeadDispositions.createdAt)),
  ]);
  const name = new Map(users.map((u) => [u.id, u.name]));

  // Unmapped CSV columns kept at import time — surfaced verbatim.
  const extra = Object.entries((lead.rawData as Record<string, unknown> | null) ?? {})
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");

  return (
    <PageShell
      title={lead.parkName ?? "(unnamed park)"}
      subtitle={[lead.street, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ") || "No address on file"}
      action={<Link href="/admin/leads" className="text-xs text-muted hover:text-foreground">← Back to pool</Link>}
      width="default"
    >
      <div className="space-y-5">
        {/* Core */}
        <section className="rounded-xl border border-border bg-background p-5">
          <h2 className="text-sm font-bold mb-3">Lead</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <Field label="Owner">{lead.ownerName ?? "—"}</Field>
            <Field label="Phone"><ContactLink kind="phone" value={lead.ownerPhone} /></Field>
            <Field label="Email"><ContactLink kind="email" value={lead.ownerEmail} /></Field>
            <Field label="Pads">{lead.pads ?? "—"}</Field>
            <Field label="Listing status">{lead.listingStatus ?? "—"}</Field>
            <Field label="Source">{lead.source ?? "—"}</Field>
          </dl>
          {lead.importedNotes && (
            <p className="mt-4 pt-3 border-t border-border text-sm text-foreground/80 whitespace-pre-wrap">{lead.importedNotes}</p>
          )}
        </section>

        {/* Workflow state */}
        <section className="rounded-xl border border-border bg-background p-5">
          <h2 className="text-sm font-bold mb-3">Workflow</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <Field label="Status">{lead.status}</Field>
            <Field label="Call attempts">{lead.callAttempts}</Field>
            <Field label="Claimed by">{lead.claimedById ? name.get(lead.claimedById) ?? "?" : "—"}</Field>
            <Field label="Last call">{lead.lastCallAt ? fmtRelative(lead.lastCallAt) : "—"}</Field>
            <Field label="Next follow-up">{lead.nextFollowUpAt ? fmtDate(lead.nextFollowUpAt) : "—"}</Field>
            <Field label="Converted deal">
              {lead.convertedDealId ? (
                <Link href={`/deals/${lead.convertedDealId}` as never} className="text-primary hover:underline">Open deal →</Link>
              ) : ("—")}
            </Field>
          </dl>
          <p className="mt-3 text-[11px] text-muted">
            Uploaded {fmtDate(lead.uploadedAt ?? lead.createdAt)}
            {lead.uploadedById ? ` by ${name.get(lead.uploadedById) ?? "?"}` : ""} · batch{" "}
            <span className="font-mono">{lead.uploadBatchId?.slice(0, 8) ?? "—"}</span>
          </p>
        </section>

        {/* Extra CSV columns — the data that had nowhere to show before */}
        <section className="rounded-xl border border-border bg-background p-5">
          <h2 className="text-sm font-bold mb-1">Extra columns from the CSV</h2>
          <p className="text-[11px] text-muted mb-3">Unmapped columns are kept verbatim at import — nothing from the sheet is lost.</p>
          {extra.length === 0 ? (
            <p className="text-sm text-muted">None — every column in this row mapped to a standard field.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {extra.map(([k, v]) => (
                    <tr key={k} className="border-t border-border first:border-t-0">
                      <td className="py-1.5 pr-6 text-[11px] uppercase tracking-widest text-muted font-semibold whitespace-nowrap align-top">{k}</td>
                      <td className="py-1.5 text-foreground/85">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Call history */}
        <section className="rounded-xl border border-border bg-background p-5">
          <h2 className="text-sm font-bold mb-3">Call history · {dispositions.length}</h2>
          {dispositions.length === 0 ? (
            <p className="text-sm text-muted">No calls logged yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {dispositions.map((d) => (
                <li key={d.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{d.outcome.replace(/_/g, " ")}</span>
                    <span className="text-[11px] text-muted">{fmtRelative(d.createdAt)} · {d.byUserId ? name.get(d.byUserId) ?? "?" : "?"}</span>
                  </div>
                  {d.notes && <p className="text-[12px] text-foreground/75 mt-1 whitespace-pre-wrap">{d.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted font-semibold">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
