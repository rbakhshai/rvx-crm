"use client";

/**
 * Time-of-day greeting computed from the BROWSER clock, not the
 * server's. The server runs in UTC, so a server-rendered "Good
 * morning" was telling Arizona users good morning at 7:35 PM.
 *
 * SSR renders the neutral "Hello, X"; the effect swaps in the
 * time-aware version after hydration (avoids a hydration mismatch
 * since the server can't know the visitor's clock).
 */
import { useEffect, useState } from "react";

function timeGreeting(name: string): string {
  const h = new Date().getHours();
  const first = name?.split(" ")[0] ?? "";
  const prefix =
    h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return first ? `${prefix}, ${first}` : prefix;
}

export function LocalGreeting({ name }: { name: string }) {
  const first = name?.split(" ")[0] ?? "";
  const [text, setText] = useState(first ? `Hello, ${first}` : "Hello");
  useEffect(() => {
    setText(timeGreeting(name));
  }, [name]);
  return <>{text}</>;
}

/** "Morning / Afternoon / Evening brief" header for the daily brief card. */
export function LocalBriefLabel() {
  const [label, setLabel] = useState("Daily brief");
  useEffect(() => {
    const h = new Date().getHours();
    setLabel(h < 12 ? "Morning brief" : h < 17 ? "Afternoon brief" : "Evening brief");
  }, []);
  return <>{label}</>;
}
