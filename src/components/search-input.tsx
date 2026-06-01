"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/**
 * Generic search input. Two modes:
 *  - global (default): submits to /search?q=...
 *  - scoped: stays on current page, updates ?q= URL param
 */
export function SearchInput({
  scope = "global",
  placeholder,
  className,
  initialValue,
}: {
  scope?: "global" | "scoped";
  placeholder?: string;
  className?: string;
  initialValue?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initialValue ?? params.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (scope === "global") {
      router.push((q ? `/search?q=${encodeURIComponent(q)}` : "/search") as never);
      return;
    }
    const next = new URLSearchParams(params.toString());
    if (q) next.set("q", q);
    else next.delete("q");
    router.push(`${pathname}?${next.toString()}` as never);
  }

  return (
    <form onSubmit={submit} className={className}>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? (scope === "global" ? "Search everything…" : "Search this list…")}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        autoComplete="off"
      />
    </form>
  );
}
