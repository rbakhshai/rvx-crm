"use client";

import { useState } from "react";

/**
 * Instant park-value estimator. Value-first hook: shows a ballpark range
 * before asking for any contact info. The math is a placeholder
 * (sites × occupancy × nightly × 365 → NOI at 45% → cap-rate band) and
 * must be tuned with real market assumptions before launch.
 */
export function Estimator() {
  const [sites, setSites] = useState(120);
  const [occ, setOcc] = useState(75);
  const [rate, setRate] = useState(55);

  const revenue = sites * (occ / 100) * rate * 365;
  const noi = revenue * 0.45;
  const fmt = (n: number) => "$" + (n / 1e6).toFixed(1) + "M";

  return (
    <div className="rounded-2xl border border-[#2e2718] bg-[rgba(10,10,10,0.82)] p-6 shadow-2xl backdrop-blur-md">
      <div className="mb-4 text-[14px] font-medium uppercase tracking-[0.2em] text-[#8a773d]">
        Instant estimate · no email yet
      </div>

      <Row label="RV sites" value={sites} min={20} max={300} step={5} onChange={setSites} display={String(sites)} />
      <Row label="Occupancy" value={occ} min={30} max={100} step={1} onChange={setOcc} display={`${occ}%`} />
      <Row label="Nightly rate" value={rate} min={25} max={120} step={1} onChange={setRate} display={`$${rate}`} />

      <div className="mt-2 flex items-end justify-between gap-4 border-t border-[#2e2718] pt-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-[#9a958a]">Estimated range</div>
          <div className="mt-1.5 font-[family-name:var(--font-fraunces)] text-[38px] font-medium text-[#dbbe67]">
            {fmt(noi / 0.1)} – {fmt(noi / 0.085)}
          </div>
          <div className="mt-2 text-[15px] text-[#9a958a]">Est. annual revenue ~{fmt(revenue)}</div>
        </div>
        <a
          href="#contact"
          className="shrink-0 whitespace-nowrap rounded-md bg-[#dbbe67] px-4 py-3 text-[15px] font-medium text-[#0a0a0a] transition-colors hover:bg-[#ebc75b]"
        >
          Get my real number
        </a>
      </div>

      <p className="mt-4 text-[13px] text-[#5f5b50]">
        Illustrative only — a real estimate weighs region, amenities, and lease vs. own.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  display: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3.5">
      <label className="w-[104px] shrink-0 text-[16px] text-[#b6b1a4]">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#dbbe67]"
        aria-label={label}
      />
      <span className="w-[52px] text-right text-[17px] font-medium text-[#dbbe67]">{display}</span>
    </div>
  );
}
