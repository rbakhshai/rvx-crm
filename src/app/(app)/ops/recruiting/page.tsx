/**
 * Recruiting — leaderboard of active channels + interview pipeline.
 * Mirrors the Founder OS "Recruiting Leaderboard" but pointed at the
 * roles you're actually hiring for (closers + bird dogs).
 */
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, StatusPill, SectionLabel } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";

const REVALIDATE = "/ops/recruiting";

const KPIS = [
  { key: "active",      big: "3", label: "Active Channels", sub: "" },
  { key: "hired",       big: "0", label: "Hired",            sub: "Target: 2" },
  { key: "cost",        big: "$0", label: "Cost per Hire",   sub: "" },
  { key: "spend",       big: "$3K", label: "Est. Total Spend", sub: "Projected" },
];

const CHANNELS = [
  { recruiter: "RemotelyX",        region: "Lebanon",        candidates: "0", advanced: "0", hired: "0", cph: "--",    upfront: "$2K retainer", status: "onboarding" },
  { recruiter: "Direct (Erica)",   region: "United States",  candidates: "2", advanced: "1", hired: "0", cph: "--",    upfront: "--",          status: "in_review" },
  { recruiter: "Discord community", region: "Global",         candidates: "0", advanced: "0", hired: "0", cph: "--",    upfront: "--",          status: "open" },
];

const STATUS_TONE: Record<string, "on_track" | "behind" | "off_track" | "not_started" | "ahead"> = {
  onboarding: "on_track",
  in_review: "behind",
  open: "not_started",
};

const STATUS_LABEL: Record<string, string> = {
  onboarding: "ONBOARDING",
  in_review: "IN REVIEW",
  open: "OPEN",
};

export default async function RecruitingPage() {
  const blocks = await getOpsBlocks("recruiting.");

  return (
    <>
      <OpsHeader eyebrow="Closer + Bird-Dog Recruiting" title="Recruiting Leaderboard" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {KPIS.map((k) => {
          const bigScope = `recruiting.kpi.${k.key}.big`;
          return (
            <div key={k.key} className="rounded-xl border border-border bg-background p-5 text-center">
              <div className="text-4xl font-bold tracking-tight tabular-nums">
                <EditableBlock scope={bigScope} initial={blocks.get(bigScope) ?? k.big} revalidate={REVALIDATE} />
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-2">{k.label}</div>
              {k.sub && <div className="text-[11px] text-muted mt-1">{k.sub}</div>}
            </div>
          );
        })}
      </div>

      <SectionLabel tone="lime">Channels</SectionLabel>
      <div className="overflow-x-auto rounded-xl border border-border bg-background mb-10">
        <table className="w-full text-sm">
          <thead className="bg-foreground/[0.02]">
            <tr>
              <Th>#</Th>
              <Th>Recruiter / Channel</Th>
              <Th>Region</Th>
              <Th>Candidates</Th>
              <Th>Advanced</Th>
              <Th>Hired</Th>
              <Th>Cost / Hire</Th>
              <Th>Upfront Cost</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((c, i) => {
              const recScope = `recruiting.channel.${i}.recruiter`;
              return (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2.5 text-muted tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium">
                    <EditableBlock scope={recScope} initial={blocks.get(recScope) ?? c.recruiter} revalidate={REVALIDATE} />
                  </td>
                  <td className="px-3 py-2.5">{c.region}</td>
                  <td className="px-3 py-2.5 tabular-nums">{c.candidates}</td>
                  <td className="px-3 py-2.5 tabular-nums">{c.advanced}</td>
                  <td className="px-3 py-2.5 tabular-nums">{c.hired}</td>
                  <td className="px-3 py-2.5 tabular-nums">{c.cph}</td>
                  <td className="px-3 py-2.5">{c.upfront}</td>
                  <td className="px-3 py-2.5"><StatusPill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</StatusPill></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionLabel tone="lime">Cost Summary</SectionLabel>
      <div className="grid sm:grid-cols-3 gap-3 mb-10">
        <Cost label="Committed Spend" big="$2K" sub="RemotelyX retainer" />
        <Cost label="Projected Total" big="$3K" sub="For 2 closer hires" />
        <Cost label="Target Per-Hire" big="$1.5K" sub="" />
      </div>

      <SectionLabel tone="lime">Closer Role Profile</SectionLabel>
      <div className="rounded-xl border border-border bg-background p-5">
        <EditableBlock
          scope="recruiting.closer.profile"
          initial={blocks.get("recruiting.closer.profile") ?? "We hire closers who can run the triage cockpit solo: pick up the phone, build rapport with a seller, navigate cap-rate math, write LOIs, push deals to PSA. Ideal: 2+ years of real-estate sales, experience with park or land deals, comfort with CRM-first workflow. Comp: base + commission. Source: RemotelyX (Lebanon), Discord community, referrals from Marco."}
          revalidate={REVALIDATE}
          multiline
          variant="block"
          className="text-sm leading-relaxed"
        />
      </div>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-widest text-muted font-semibold whitespace-nowrap">{children}</th>;
}

function Cost({ label, big, sub }: { label: string; big: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5 text-center">
      <div className="text-3xl font-bold tracking-tight tabular-nums">{big}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-2">{label}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  );
}
