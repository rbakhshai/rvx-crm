"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Sticky top nav: transparent over the hero, solid + blurred once scrolled. */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 " +
        (scrolled
          ? "border-[#2e2718] bg-[rgba(10,10,10,0.92)] backdrop-blur-md"
          : "border-transparent")
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-7 py-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-fraunces)] text-[22px] tracking-[0.12em] text-[#dbbe67]"
        >
          RV PARK EXCHANGE
        </Link>
        <div className="flex items-center gap-7">
          <a
            href="#how"
            className="hidden text-[17px] text-[#cfcabd] transition-colors hover:text-[#dbbe67] sm:block"
          >
            How it works
          </a>
          <a
            href="#promises"
            className="hidden text-[17px] text-[#cfcabd] transition-colors hover:text-[#dbbe67] sm:block"
          >
            Our promises
          </a>
          <Link
            href={"/sell-your-park" as never}
            className="rounded-md bg-[#dbbe67] px-5 py-2.5 text-[16px] font-medium text-[#0a0a0a] transition-colors hover:bg-[#ebc75b]"
          >
            Sell your park
          </Link>
        </div>
      </div>
    </nav>
  );
}
