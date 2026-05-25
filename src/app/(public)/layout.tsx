import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RV Park Exchange",
  description: "Sell your RV park. Confidential. No obligation. No agency fees if we buy.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border px-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-sm font-semibold">R</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">RV Park Exchange</div>
            <div className="text-[10px] uppercase tracking-widest text-muted">rvparkexchange.com</div>
          </div>
        </a>
        <a href="/login" className="text-xs text-muted hover:text-foreground">Team sign-in</a>
      </header>
      {children}
      <footer className="border-t border-border mt-16 px-6 py-6 text-xs text-muted text-center">
        RV Park Exchange · rvparkexchange.com · Confidential RV park acquisitions
      </footer>
    </div>
  );
}
