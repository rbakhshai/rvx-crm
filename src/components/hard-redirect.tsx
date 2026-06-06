"use client";

import { useEffect } from "react";

/**
 * Forces a hard browser navigation (window.location.replace), bypassing the
 * Next.js router. Useful when you want to escape an intercepting route
 * that's mistakenly captured a real sub-route URL (e.g. /deals/board which
 * looks like /deals/[id] to the (.)deals/[id] intercept).
 */
export function HardRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}
