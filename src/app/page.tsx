import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-foreground/[0.03]">
          <span className="size-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium tracking-wide">RV Park Exchange</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">
          Buy or sell RV parks with <span className="text-primary">rvparkexchange.com</span>.
        </h1>
        <p className="text-muted">Confidential acquisitions. No agency fees if we buy your park.</p>
        <div className="pt-2 flex flex-wrap gap-3 justify-center">
          <Link
            href={"/sell-your-park" as never}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Sell your park
            <span aria-hidden>→</span>
          </Link>
          <Link
            href={"/buyer-intake" as never}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-foreground/[0.04] transition"
          >
            Buy a park
          </Link>
        </div>
        <div className="pt-3 flex flex-wrap gap-4 justify-center items-center text-xs text-muted">
          <Link href={"/bird-dog" as never} className="hover:text-foreground">
            Apply as a Bird Dog →
          </Link>
          <span>·</span>
          <Link href={"/login" as never} className="hover:text-foreground">
            Team sign-in →
          </Link>
        </div>
      </div>
    </main>
  );
}
