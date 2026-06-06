import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../page-shell";
import { fmtStripeAmount, getRevenueSummary } from "@/lib/stripe";
import { fmtDate } from "@/lib/date-format";

export const dynamic = "force-dynamic"; // always pull fresh from Stripe

// One owned park for now. When you acquire a second, we'll swap this for
// a per-park grouping driven by Stripe `metadata.park`.
const PARK_NAME = "Fort Valley Ranch";

export default async function RevenuePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/admin/revenue");
  if (!(await hasPermission(session.user, "view_revenue"))) {
    return (
      <PageShell width="wide" title="Park Performance" subtitle="You don't have permission to view revenue.">
        <div className="rounded-xl border border-border p-10 text-center text-sm text-muted">
          Ask an admin to grant you the &quot;See revenue dashboard&quot; capability under Settings → Role permissions.
        </div>
      </PageShell>
    );
  }

  const summary = await getRevenueSummary();

  if (!summary.configured) {
    return (
      <PageShell width="wide" title="Park Performance" subtitle="Money coming in from parks RVX owns.">
        <ConnectStripeCard />
      </PageShell>
    );
  }

  const currency = summary.currencies[0] ?? "usd";

  return (
    <PageShell width="wide" title="Park Performance" subtitle="Pulled live from Stripe.">
      {/* Hero — park name + total */}
      <section className="rounded-2xl border border-border bg-gradient-to-b from-gold/[0.06] to-transparent p-8 text-center">
        <div className="text-[11px] uppercase tracking-widest text-muted font-medium">
          Park
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{PARK_NAME}</h2>
        <div className="mt-6 text-[10px] uppercase tracking-widest text-muted font-medium">
          Total sales
        </div>
        <div className="mt-1 text-5xl font-semibold tabular-nums">
          {fmtStripeAmount(summary.allTimeApproxCents, currency)}
        </div>
        <div className="mt-2 text-xs text-muted">
          {summary.recent.length} charge{summary.recent.length === 1 ? "" : "s"} in the most recent sample
        </div>
      </section>

      {/* Time-window breakdown */}
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="Month to date" amount={summary.monthToDateCents} currency={currency} />
        <StatCard label="Last 30 days" amount={summary.last30dCents} currency={currency} />
      </section>

      {/* Recent charges */}
      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-widest text-muted font-medium mb-3">Recent charges</h2>
        {summary.recent.length === 0 ? (
          <div className="text-sm text-muted">No charges yet.</div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-foreground/[0.03] text-[11px] uppercase tracking-widest text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Customer</th>
                  <th className="text-left px-3 py-2 font-medium">Description</th>
                  <th className="text-right px-3 py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground/80 tabular-nums">
                      {fmtDate(r.created)}
                    </td>
                    <td className="px-3 py-2 truncate max-w-[240px]">
                      <div className="font-medium">{r.customerName ?? "—"}</div>
                      <div className="text-[11px] text-muted truncate">{r.customerEmail ?? ""}</div>
                    </td>
                    <td className="px-3 py-2 truncate max-w-[320px] text-foreground/80">{r.description ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {fmtStripeAmount(r.amount, r.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function StatCard({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  return (
    <div className="rounded-xl border border-border p-4 bg-background">
      <div className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{fmtStripeAmount(amount, currency)}</div>
    </div>
  );
}

function ConnectStripeCard() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-10 text-center max-w-xl mx-auto">
      <h2 className="text-lg font-semibold">Connect Stripe to see Fort Valley Ranch revenue</h2>
      <p className="mt-2 text-sm text-muted">
        We&apos;ll show the total sales front and center, plus a list of recent charges.
      </p>
      <ol className="mt-6 text-left text-sm space-y-2 max-w-md mx-auto">
        <li>
          1. Go to{" "}
          <a className="text-primary hover:underline" href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
            Stripe Dashboard → API keys
          </a>
        </li>
        <li>
          2. Click <strong>Create restricted key</strong>. Give it read-only access to <strong>Charges</strong> and{" "}
          <strong>Customers</strong>. Nothing else.
        </li>
        <li>
          3. Add to <code className="text-xs">.env.local</code>:
          <br />
          <code className="text-xs">STRIPE_SECRET_KEY=&quot;rk_live_...&quot;</code>
        </li>
        <li>4. Tell me to restart the dev server.</li>
      </ol>
      <p className="mt-6 text-xs text-muted">
        Restricted keys are safer than the full <code className="text-xs">sk_live_</code> secret — even if it
        ever leaked, the worst anyone could do is read your charge list.
      </p>
    </div>
  );
}
