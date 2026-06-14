import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { SiteNav } from "./site-nav";

/**
 * Fraunces — editorial serif used for the marketing headlines. Loaded
 * alongside the app's Rubik (which stays the default everywhere else).
 * Exposed as `--font-fraunces`; referenced via `font-[family-name:var(--font-fraunces)]`.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RV Park Exchange — You built it. We'll keep it standing.",
  description:
    "We buy and run RV parks nationwide — preserving owner legacies with hospitality, systems, and capital. Confidential. No obligation. No agency fees if we buy.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} min-h-screen bg-[#0a0a0a] text-[#f5f5f5]`}>
      <SiteNav />
      <main>{children}</main>
      <footer className="border-t border-[#2e2718] bg-[#0a0a0a] px-7 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rvx-logo-full.png"
            alt="RV Park Exchange"
            className="h-20 w-auto"
            style={{ mixBlendMode: "screen" }}
          />
          <span className="text-[16px] text-[#7a756a]">Honoring legacies. Growing communities.</span>
          <span className="text-[16px] text-[#7a756a]">© 2026 RV Park Exchange</span>
        </div>
      </footer>
    </div>
  );
}
