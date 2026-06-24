/**
 * /acquisition/new-hires/new — open a new acquisition hire request.
 * Same form as the leadership desk; the hidden `category` field routes
 * it into the acquisition queue. Detail page is where the rest of the
 * fields get filled in.
 */
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../../page-shell";
import { createHireRequestAction } from "@/app/actions/hires";

export default async function NewAcquisitionHirePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "manage_hires"))) {
    return (
      <PageShell title="New Hire Request" subtitle="You don't have permission to open a hire request.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;Create + advance hires&quot; capability.</p>
      </PageShell>
    );
  }

  async function action(formData: FormData) {
    "use server";
    const r = await createHireRequestAction(formData);
    if (r.ok && r.id) redirect(`/acquisition/new-hires/${r.id}`);
  }

  return (
    <PageShell
      title="New Hire Request"
      subtitle="Start with the basics. You can fill in duties, finance notes, and the rest on the next screen."
      width="default"
    >
      <form action={action} className="space-y-5 max-w-2xl">
        {/* Routes this request into the acquisition desk. */}
        <input type="hidden" name="category" value="acquisition" />

        <Field
          label="Candidate name"
          name="candidateName"
          required
          placeholder="Jordan Lee"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email (optional)" name="candidateEmail" type="email" placeholder="jordan@example.com" />
          <Field label="Phone (optional)" name="candidatePhone" type="tel" placeholder="(555) 123-4567" />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-widest text-muted font-medium mb-1.5">
            Type
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { v: "contractor_1099", label: "1099 contractor" },
              { v: "employee",        label: "Employee" },
              { v: "vendor",          label: "Vendor" },
            ].map((t, i) => (
              <label key={t.v} className="cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={t.v}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs border border-border bg-background peer-checked:bg-foreground peer-checked:text-background peer-checked:font-semibold peer-checked:border-foreground transition">
                  {t.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <Field label="Role title (optional)" name="roleTitle" placeholder="Acquisitions Level 1 — Lead Generator" />
        <Field label="For which team or unit?" name="forUnit" placeholder="Acquisitions" />

        <div>
          <label className="block text-[11px] uppercase tracking-widest text-muted font-medium mb-1.5">
            Roles &amp; duties (optional now — you&apos;ll add this on the next screen)
          </label>
          <textarea
            name="rolesAndDuties"
            rows={6}
            placeholder="What will this person actually do day-to-day? Call volume? Comp / commission split? Anything finance + founder should know upfront."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
          >
            Open request
          </button>
          <Link href="/acquisition/new-hires" className="text-sm text-muted hover:text-foreground">Cancel</Link>
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
