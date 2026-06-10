/**
 * /reimbursements/new — submit a purchase request.
 *
 * Fields modeled directly from Reza's spec: park / requested (auto) /
 * needed-by / item / why / link / their full name (auto from session).
 */
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../page-shell";
import { createReimbursementAction } from "@/app/actions/reimbursements";

export default async function NewReimbursementPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "manage_reimbursements"))) {
    return (
      <PageShell title="New Reimbursement Request" subtitle="You don't have permission to submit reimbursements.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;Create + approve reimbursements&quot; capability.</p>
      </PageShell>
    );
  }

  async function action(formData: FormData) {
    "use server";
    const r = await createReimbursementAction(formData);
    if (r.ok && r.id) redirect(`/reimbursements/${r.id}`);
  }

  return (
    <PageShell
      title="New Reimbursement Request"
      subtitle={`Submitting as ${session.user.name}.`}
      width="default"
    >
      <form action={action} className="space-y-5 max-w-2xl">
        <Field
          label="What do you need?"
          name="itemDescription"
          required
          placeholder="Tractor battery / Saddle / Fence post wire"
        />
        <Field label="Park" name="parkName" placeholder="Black Hills RV Park" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Needed by" name="neededBy" type="date" />
          <Field label="Estimated cost (USD)" name="amount" type="text" placeholder="125.00" />
        </div>
        <Field
          label="Link to the product (so we can purchase)"
          name="productUrl"
          type="url"
          placeholder="https://www.amazon.com/dp/…"
        />
        <div>
          <label className="block text-[11px] uppercase tracking-widest text-muted font-medium mb-1.5">
            Why do you need it?
          </label>
          <textarea
            name="reason"
            rows={4}
            placeholder="Old one's dead; can't run the morning chores without it."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
          >
            Submit for approval
          </button>
          <Link href="/reimbursements" className="text-sm text-muted hover:text-foreground">Cancel</Link>
        </div>
      </form>
    </PageShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-widest text-muted font-medium mb-1.5">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
