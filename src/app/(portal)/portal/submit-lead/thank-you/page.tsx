import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <div className="text-5xl">✅</div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Lead submitted</h1>
      <p className="mt-3 text-sm text-muted">
        Our team will review the numbers and update you here in the portal. You'll see it move through stages
        — from <span className="text-foreground">"New — under review"</span> all the way to{" "}
        <span className="text-foreground">"Closed"</span> if we acquire it.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-foreground/[0.04]"
        >
          ← Back to my leads
        </Link>
        <Link
          href="/portal/submit-lead"
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-gold-foreground hover:opacity-90"
        >
          Submit another
        </Link>
      </div>
    </div>
  );
}
