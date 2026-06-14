"use client";

import { useState } from "react";

const STEPS = [
  {
    title: "Share your park details",
    body: "The basics — sites, occupancy, location. No financials yet, and no commitment. A 5-minute form or a phone call, whichever you prefer.",
  },
  {
    title: "We review the fit together",
    body: "We look at whether your park fits how we operate — and you see our timeline and approach before you ever share a single number.",
  },
  {
    title: "Close on a clear timeline",
    body: "Fair terms, a date you can plan around, and a transition that keeps your staff, your name, and your regulars firmly in place.",
  },
];

/** Clickable 3-step seller journey with a filling progress bar. */
export function PathStepper() {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="my-7 h-1 overflow-hidden rounded-full bg-[#1c1c1c]">
        <div
          className="h-full bg-[#dbbe67] transition-[width] duration-500"
          style={{ width: `${(active + 1) * 33.34}%` }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => {
          const done = i <= active;
          const isActive = i === active;
          return (
            <button
              key={s.title}
              onClick={() => setActive(i)}
              className={
                "rounded-xl border p-5 text-left transition-all " +
                (isActive
                  ? "border-[#3a3320] bg-[#16140d]"
                  : "border-[#222] bg-[#0f0f0f] hover:-translate-y-1")
              }
            >
              <span
                className={
                  "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-[16px] " +
                  (done ? "bg-[#dbbe67] text-[#0a0a0a]" : "border border-[#8a773d] text-[#dbbe67]")
                }
              >
                {i + 1}
              </span>
              <div className={"text-[20px] font-medium " + (isActive ? "text-[#f5f5f5]" : "text-[#888]")}>
                {s.title}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-[#2e2718] bg-[#111] p-7">
        <div className="font-[family-name:var(--font-fraunces)] text-[23px] font-medium text-[#dbbe67]">
          {STEPS[active].title}
        </div>
        <p className="mt-2.5 max-w-2xl text-[19px] leading-relaxed text-[#bdb8ab]">{STEPS[active].body}</p>
      </div>
    </div>
  );
}
