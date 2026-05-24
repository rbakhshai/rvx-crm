import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-foreground/[0.03]">
          <span className="size-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium tracking-wide">RVX CRM · Internal</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">
          The brokerage operating system for{" "}
          <span className="text-primary">rvparkexchange.com</span>
        </h1>
        <p className="text-muted">
          Buyers, deals, bird dogs, and everything between — one place, owned outright.
        </p>
        <div className="pt-2">
          <Link
            href={"/login" as never}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Sign in
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
