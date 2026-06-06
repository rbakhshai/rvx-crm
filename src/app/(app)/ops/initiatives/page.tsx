/**
 * Initiatives — strategy execution. Cards grouped by colored section label.
 * Each initiative card carries: title, owner+timeframe subtitle, status
 * pill, progress bar %, and a checklist of milestones.
 */
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, SectionLabel, TimeToggle, StatusPill, AccentCard, parsePeriod } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";

const REVALIDATE = "/ops/initiatives";
const PATHNAME = "/ops/initiatives";

const SECTIONS: Array<{
  label: string;
  tone: "lime" | "red" | "blue";
  items: Array<{
    title: string;
    owner: string;
    status: "on_track" | "behind" | "not_started";
    progress: number;
    checklist: string[];
  }>;
}> = [
  {
    label: "Sourcing (Acquisitions)",
    tone: "lime",
    items: [
      {
        title: "Bird-dog network to 10 active",
        owner: "Erica + Reza · Q4",
        status: "behind",
        progress: 35,
        checklist: [
          "Recruit 2 new bird dogs from Discord network",
          "Onboard BD level 1/2/3 program",
          "Weekly leaderboard published",
          "Top BD earns >$10K monthly",
        ],
      },
      {
        title: "Park owner outreach engine",
        owner: "Reza · Q4",
        status: "on_track",
        progress: 60,
        checklist: [
          "Apollo list of 1,000 MHRV park owners built",
          "First touch sequence launched",
          "Reply rate >3% confirmed",
          "Handoff to closers automated",
        ],
      },
    ],
  },
  {
    label: "Closing",
    tone: "lime",
    items: [
      {
        title: "Marco fully ramped (closer #1)",
        owner: "Reza · Q4",
        status: "on_track",
        progress: 70,
        checklist: [
          "Marco trained on triage cockpit",
          "First 3 LOIs sent solo",
          "Cap rate analysis SOP",
          "First solo close",
        ],
      },
      {
        title: "Hire closer #2",
        owner: "Erica · Q4",
        status: "not_started",
        progress: 0,
        checklist: [
          "Closer role profile written",
          "RemotelyX recruiter brief sent",
          "5 candidates screened",
          "Offer extended",
        ],
      },
    ],
  },
  {
    label: "Tech (CRM)",
    tone: "lime",
    items: [
      {
        title: "Migrate fully off Ontraport",
        owner: "Reza · Q4",
        status: "on_track",
        progress: 80,
        checklist: [
          "Contacts migrated",
          "Companies migrated",
          "Bird dogs migrated",
          "Deals migrated",
          "Notes migrated",
          "Ontraport account closed",
        ],
      },
      {
        title: "Email infrastructure live (Resend)",
        owner: "Reza · Q4",
        status: "behind",
        progress: 20,
        checklist: [
          "Resend account",
          "DNS records published",
          "Templates wired",
          "First production send",
        ],
      },
    ],
  },
  {
    label: "Culture",
    tone: "red",
    items: [
      {
        title: "Weekly L10 cadence locked",
        owner: "Reza + Erica · Q4",
        status: "behind",
        progress: 40,
        checklist: [
          "Standing Mon 9am invite sent",
          "Scorecard reviewed every week",
          "Issues solved or carried forward",
          "Meeting rating average ≥ 8",
        ],
      },
    ],
  },
];

export default async function InitiativesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params.period);

  const blocks = await getOpsBlocks("initiatives.");

  return (
    <>
      <OpsHeader eyebrow="Business Strategy Initiatives" title="Initiatives" />

      <div className="mb-6">
        <TimeToggle pathname={PATHNAME} period={period} />
      </div>

      <div className="space-y-10">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            <SectionLabel tone={section.tone}>{section.label}</SectionLabel>
            <div className="space-y-3">
              {section.items.map((it, ii) => {
                const titleScope = `initiatives.${si}.${ii}.title`;
                const ownerScope = `initiatives.${si}.${ii}.owner`;
                return (
                  <AccentCard
                    key={ii}
                    accent={section.tone === "red" ? "red" : "lime"}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold leading-tight">
                          <EditableBlock
                            scope={titleScope}
                            initial={blocks.get(titleScope) ?? it.title}
                            revalidate={REVALIDATE}
                          />
                        </h3>
                        <div className="text-[12px] text-muted mt-0.5">
                          <EditableBlock
                            scope={ownerScope}
                            initial={blocks.get(ownerScope) ?? it.owner}
                            revalidate={REVALIDATE}
                          />
                        </div>
                      </div>
                      <StatusPill tone={it.status}>{labelStatus(it.status)}</StatusPill>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
                        <div className="h-full bg-lime-400" style={{ width: `${it.progress}%` }} />
                      </div>
                      <span className="text-[11px] text-muted tabular-nums w-9 text-right">{it.progress}%</span>
                    </div>

                    {/* Checklist */}
                    <ul className="space-y-1.5">
                      {it.checklist.map((c, ci) => {
                        const checkScope = `initiatives.${si}.${ii}.check.${ci}`;
                        return (
                          <li key={ci} className="flex items-start gap-2 text-sm">
                            <input type="checkbox" disabled className="mt-1 size-3.5" />
                            <EditableBlock
                              scope={checkScope}
                              initial={blocks.get(checkScope) ?? c}
                              revalidate={REVALIDATE}
                              className="flex-1"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </AccentCard>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function labelStatus(s: "on_track" | "behind" | "not_started"): string {
  return s === "on_track" ? "ON TRACK" : s === "behind" ? "BEHIND" : "NOT STARTED";
}
